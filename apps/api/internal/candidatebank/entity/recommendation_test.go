package entity

import "testing"

func TestExplainUnknownAndMismatch(t *testing.T) {
	yes, no := true, false
	r := Explain(Card{}, &yes, nil, &no, &yes)
	if r.MatchedConditions != 2 || len(r.Reasons) != 3 || len(r.UnknownConditions) != 1 || r.UnknownConditions[0] != "salary" || len(r.MismatchedConditions) != 1 || r.MismatchedConditions[0] != "city" {
		t.Fatalf("Неизвестное условие или несовпадение признано совпадением: %+v", r)
	}
}
