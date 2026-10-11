package entity

import (
	"errors"
	"testing"
)

func TestGrantInputNormalize(t *testing.T) {
	company := "0b7d3b1e-8f3a-4c58-9d3e-5a1f2c3d4e5f"
	for _, in := range []GrantInput{
		{Kind: KindProcessing, PolicyVersion: "v1"},
		{Kind: KindPublication, PolicyVersion: "v1"},
		{Kind: KindATSTransfer, PolicyVersion: "v1", CompanyID: &company},
	} {
		in := in
		if err := in.Normalize("v1"); err != nil {
			t.Fatalf("%+v: %v", in, err)
		}
	}
	upper := "0B7D3B1E-8F3A-4C58-9D3E-5A1F2C3D4E5F"
	in := GrantInput{Kind: KindATSTransfer, PolicyVersion: "v1", CompanyID: &upper}
	if err := in.Normalize("v1"); err != nil || *in.CompanyID != company {
		t.Fatalf("UUID должен приводиться к нижнему регистру: %v %v", in.CompanyID, err)
	}
	bad := "не-uuid"
	empty := ""
	for name, in := range map[string]GrantInput{
		"неизвестный вид":            {Kind: "other", PolicyVersion: "v1"},
		"пустой вид":                 {PolicyVersion: "v1"},
		"пустая версия":              {Kind: KindProcessing},
		"processing с компанией":     {Kind: KindProcessing, PolicyVersion: "v1", CompanyID: &company},
		"publication с компанией":    {Kind: KindPublication, PolicyVersion: "v1", CompanyID: &company},
		"ats_transfer без компании":  {Kind: KindATSTransfer, PolicyVersion: "v1"},
		"ats_transfer, плохой UUID":  {Kind: KindATSTransfer, PolicyVersion: "v1", CompanyID: &bad},
		"ats_transfer, пустой UUID":  {Kind: KindATSTransfer, PolicyVersion: "v1", CompanyID: &empty},
		"версия длиннее 32 символов": {Kind: KindProcessing, PolicyVersion: "v123456789012345678901234567890123"},
	} {
		in := in
		var v *ValidationError
		if err := in.Normalize("v1"); !errors.As(err, &v) || v.Message == "" {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
	old := GrantInput{Kind: KindProcessing, PolicyVersion: "v0"}
	if err := old.Normalize("v1"); !errors.Is(err, ErrPolicyOutdated) {
		t.Fatalf("устаревшая версия: %v", err)
	}
}

func TestValidKind(t *testing.T) {
	for kind, want := range map[string]bool{KindProcessing: true, KindPublication: true, KindATSTransfer: true, "": false, "Processing": false, "other": false} {
		if ValidKind(kind) != want {
			t.Fatalf("ValidKind(%q) != %v", kind, want)
		}
	}
}
