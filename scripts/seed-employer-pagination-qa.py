#!/usr/bin/env python3
"""Create additive, repeatable pagination fixtures in the local fsp Docker stack.

No real accounts are edited and no invitation emails are sent. Historical tasks
are fixtures on separate publication dates; the daily publication quota stays intact.
Run with --company-id pointing to a QA company owned by the test employer.
Requires --apply to write. S3 credentials are read from the root .env, never logged.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import hmac
import json
import pathlib
import subprocess
import urllib.parse
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
PREFIX = 'qa-pagination-v1'
CONTAINER = 'fsp-postgres-1'
UID_SCOPE = ''


def sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def uid(kind, index):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'{PREFIX}/{UID_SCOPE}/{kind}/{index}'))


def db(statement):
    result = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER, 'sh', '-c',
         'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1'],
        input=statement, text=True, capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def s3(method, bucket, key, env, body=b'', media_type='application/octet-stream'):
    host = '127.0.0.1:8333'
    uri = '/' + urllib.parse.quote(bucket + '/' + key, safe='/')
    now = dt.datetime.now(dt.timezone.utc)
    date, stamp = now.strftime('%Y%m%d'), now.strftime('%Y%m%dT%H%M%SZ')
    digest = hashlib.sha256(body).hexdigest()
    headers = f'host:{host}\nx-amz-content-sha256:{digest}\nx-amz-date:{stamp}\n'
    names = 'host;x-amz-content-sha256;x-amz-date'
    canonical = f'{method}\n{uri}\n\n{headers}\n{names}\n{digest}'
    scope = f'{date}/us-east-1/s3/aws4_request'
    to_sign = f'AWS4-HMAC-SHA256\n{stamp}\n{scope}\n' + hashlib.sha256(canonical.encode()).hexdigest()
    signing = ('AWS4' + env['S3_SECRET_KEY']).encode()
    for part in [date, 'us-east-1', 's3', 'aws4_request']:
        signing = hmac.new(signing, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(signing, to_sign.encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(
        'http://' + host + uri, method=method, data=body if method == 'PUT' else None,
        headers={'x-amz-date': stamp, 'x-amz-content-sha256': digest,
                 'Authorization': f'AWS4-HMAC-SHA256 Credential={env["S3_ACCESS_KEY"]}/{scope}, SignedHeaders={names}, Signature={signature}',
                 'Content-Type': media_type},
    )
    return urllib.request.urlopen(request, timeout=15).read()


def main():
    global UID_SCOPE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--company-id', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    company_id = str(uuid.UUID(args.company_id))
    UID_SCOPE = company_id
    company = json.loads(db(f"SELECT row_to_json(x) FROM (SELECT c.*,m.user_id::text AS owner_id FROM companies c JOIN company_members m ON m.company_id=c.id AND m.role='owner' AND m.status='active' WHERE c.id={sql(company_id)} AND c.name LIKE 'QA%') x;"))
    owner = company['owner_id']
    company_name = company['name']
    sources = json.loads(db(f"SELECT json_agg(f) FROM files f WHERE f.status='ready' AND (f.id IN (SELECT file_id FROM company_documents WHERE company_id={sql(company_id)}) OR f.id IN (SELECT file_id FROM company_daily_tasks WHERE company_id={sql(company_id)}));"))
    document = next(f for f in sources if f['purpose'] == 'company_document')
    condition = next(f for f in sources if f['purpose'] == 'company_task')
    statements, uploads = [], []
    now = dt.datetime.now(dt.timezone.utc)

    def insert(table, **values):
        statements.append(f"INSERT INTO {table} ({','.join(values)}) VALUES ({','.join(sql(v) for v in values.values())}) ON CONFLICT DO NOTHING;")

    def file(kind, index, owner_id, source, name):
        file_id = uid('file-' + kind, index)
        key = f'{PREFIX}/{company_id}/{kind}/{file_id}'
        insert('files', id=file_id, owner_user_id=owner_id, bucket=source['bucket'], object_key=key,
               purpose=kind, original_name=name, media_type=source['media_type'], size_bytes=source['size_bytes'],
               checksum_sha256=source['checksum_sha256'], status='ready', visibility='private')
        uploads.append((source, key))
        return file_id

    # 105 additional companies exercise the 100-item API loader and overview paging.
    for i in range(105):
        company = uid('company', i)
        insert('companies', id=company, name=f'QA пагинация · компания {i + 1:03}',
               contact_email=f'qa-company-{i + 1:03}@example.test', description='Синтетическая компания для проверки пагинации.')
        insert('company_members', company_id=company, user_id=owner, role='owner')

    for i in range(45):
        user = uid('member', i)
        insert('users', id=user, role='employer')
        insert('company_members', company_id=company_id, user_id=user, role='recruiter' if i % 2 else 'viewer')
        invitation = uid('invitation', i)
        insert('company_invitations', id=invitation, company_id=company_id, created_by=owner,
               email=f'qa-team-{i + 1:03}@example.test', role='recruiter' if i % 2 else 'viewer',
               token_hash=hashlib.sha256(invitation.encode()).hexdigest(), status='pending')
        document_id = file('company_document', i, owner, document, f'QA-document-{i + 1:03}.png')
        insert('company_documents', company_id=company_id, file_id=document_id)

    for status in ['active', 'draft', 'archived']:
        for i in range(45):
            need_id = uid('need-' + status, i)
            insert('employer_needs', id=need_id, company_id=company_id, created_by=owner,
                   title=f'QA {status} · вакансия {i + 1:03}', description=f'QA потребность {i + 1:03}. Разработка и поддержка сервисов.',
                   specialization_id=1 if i % 2 else 2, grade_id=2 if i % 3 else 3,
                   salary_from_rub=100000 + i * 1000, salary_to_rub=180000 + i * 1000,
                   city='Москва' if i % 2 else 'Санкт-Петербург', timezone='Europe/Moscow', status=status)
            insert('need_work_formats', need_id=need_id, work_format_id=3)

    for i in range(126):
        user, candidate = uid('candidate-user', i), uid('candidate', i)
        insert('users', id=user, role='candidate')
        insert('candidate_profiles', id=candidate, user_id=user, headline=f'QA профиль {i + 1:03}',
               city=f'QA · {"Москва" if i % 2 else "Санкт-Петербург"} · {i + 1:03}', timezone='Europe/Moscow',
               experience_months=(i % 10) * 12, salary_min_rub=70000 + i * 500, search_status='passive' if i % 3 == 0 else 'open')
        for kind in ['processing', 'publication']:
            insert('candidate_consents', id=uid('consent-' + kind, i), user_id=user, kind=kind, policy_version='qa-fixture-v1')
        insert('candidate_onboarding', candidate_id=candidate, industry='QA · IT', specialization_id=1 if i % 2 else 2, grade_id=2 if i % 3 else 3)
        insert('candidate_work_formats', candidate_id=candidate, work_format_id=3)
        insert('candidate_contacts', user_id=user, full_name=f'QA кандидат {i + 1:03}', email=f'qa-candidate-{i + 1:03}@example.test')
        if i >= 81:
            status = ['sent', 'viewed', 'accepted', 'rejected'][i % 4]
            created = now - dt.timedelta(days=1, minutes=i)
            viewed = created + dt.timedelta(minutes=1) if status != 'sent' else None
            responded = created + dt.timedelta(minutes=2) if status in ['accepted', 'rejected'] else None
            insert('candidate_offers', id=uid('offer', i), company_id=company_id, candidate_id=candidate,
                   created_by=owner, need_id=uid('need-active', i % 45), company_name=company_name,
                   title=f'QA · предложение {i + 1:03}', description='Синтетическое предложение для проверки пагинации и фильтров.',
                   salary_from_rub=120000, salary_to_rub=180000, contact_email='qa@example.test', status=status,
                   created_at=created.isoformat(), viewed_at=viewed.isoformat() if viewed else None,
                   responded_at=responded.isoformat() if responded else None)
            insert('company_candidate_interactions', company_id=company_id, candidate_id=candidate, last_viewed_at=created.isoformat(), last_offered_at=created.isoformat())

    # Separate historical publication days comply with UNIQUE(company_id,published_on).
    for i in range(47):
        task_id = uid('task', i)
        published = now - dt.timedelta(days=i + 1)
        file_id = file('company_task', i, owner, condition, f'QA-condition-{i + 1:03}.md')
        insert('company_daily_tasks', id=task_id, company_id=company_id, created_by=owner,
               title=f'QA · задание {i + 1:03}', description=f'Синтетическое задание {i + 1:03} для проверки списка, условия и решений.',
               specialization_id=1 if i % 2 else 2, grade_id=2, file_id=file_id,
               status='open' if i % 2 else 'closed', deadline_at=(now + dt.timedelta(days=7)).isoformat(),
               published_at=published.isoformat())

    # 90 submissions on one QA task allow paging both reviewed and pending lists.
    for i in range(90):
        candidate = uid('candidate', i)
        file_id = file('task_solution', i, uid('candidate-user', i), condition, f'QA-solution-{i + 1:03}.md')
        submitted = now - dt.timedelta(hours=12, minutes=i)
        reviewed = i % 2 == 0
        insert('company_task_submissions', id=uid('submission', i), task_id=uid('task', 0), candidate_id=candidate,
               file_id=file_id, status='reviewed' if reviewed else 'submitted', submitted_at=submitted.isoformat(),
               score=i % 101 if reviewed else None, feedback='QA · проверено' if reviewed else None,
               reviewed_at=(submitted + dt.timedelta(minutes=5)).isoformat() if reviewed else None, reviewed_by=owner if reviewed else None)

    output = pathlib.Path('/tmp/fsp-employer-pagination-seed.sql')
    output.write_text('BEGIN;\n' + '\n'.join(statements) + '\nCOMMIT;\n')
    summary = {'companyId': company_id, 'submissionTaskId': uid('task', 0), 'companies': 105, 'members': 45, 'invitations': 45,
               'documents': 45, 'needsPerStatus': 45, 'candidates': 126, 'offers': 45, 'tasks': 47, 'submissions': 90}
    print(json.dumps(summary, ensure_ascii=False))
    if not args.apply:
        print(f'Dry run: SQL saved to {output}. Add --apply to seed the local stack.')
        return
    env = {}
    for line in (ROOT / '.env').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            env[key.strip()] = value.strip().strip('"\'')
    bodies = {f['id']: s3('GET', f['bucket'], f['object_key'], env) for f in [document, condition]}
    def upload(item):
        source, key = item
        s3('PUT', source['bucket'], key, env, bodies[source['id']], source['media_type'])
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(upload, uploads))
    db(output.read_text())
    pathlib.Path('/tmp/fsp-employer-pagination-qa.json').write_text(json.dumps(summary))
    print('Local QA fixtures created. Existing records were preserved.')


if __name__ == '__main__':
    main()
