package entity

import "testing"

func TestHistoryPagination(t *testing.T) {
	for _, raw := range []string{"", "limit=10&offset=20"} {
		if _, _, err := ParseHistoryQuery(raw); err != nil {
			t.Fatal(err)
		}
	}
	for _, raw := range []string{"limit=0", "limit=101", "offset=-1", "offset=10001", "limit=1&limit=2", "foo=bar", "limit="} {
		if _, _, err := ParseHistoryQuery(raw); err == nil {
			t.Fatal(raw)
		}
	}
}
