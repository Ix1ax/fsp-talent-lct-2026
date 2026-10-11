package demoseed

import (
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"testing"
)

func TestFixturesPassRealUploadValidation(t *testing.T) {
	for _, f := range []files.File{
		{Purpose: "company_document", OriginalName: "demo.pdf", ObjectKey: "demo/jury-v1/document-1.pdf"},
		{Purpose: "company_logo", OriginalName: "demo.png"},
		{Purpose: files.PurposeCandidateAvatar, OriginalName: "avatar.png"},
		{Purpose: files.PurposeCompanyTask, OriginalName: "task.md"},
		{Purpose: files.PurposeTaskSolution, OriginalName: "solution.md"},
	} {
		t.Run(f.Purpose, func(t *testing.T) {
			b, err := fixture(f)
			if err != nil {
				t.Fatal(err)
			}
			prepared, err := files.Prepare(f.OriginalName, f.Purpose, b)
			if err != nil {
				t.Fatal(err)
			}
			if prepared.SizeBytes != int64(len(b)) || len(prepared.ChecksumSHA256) != 64 {
				t.Fatal("invalid metadata")
			}
		})
	}
}
