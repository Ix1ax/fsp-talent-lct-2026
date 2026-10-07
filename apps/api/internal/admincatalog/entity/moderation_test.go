package entity

import "testing"

func TestModerationValidation(t *testing.T) {
	cases := []struct {
		action string
		in     ModerationInput
		ok     bool
	}{
		{"approved", ModerationInput{}, true},
		{"rejected", ModerationInput{}, false},
		{"rejected", ModerationInput{Reason: " Спам "}, true},
		{"merged", ModerationInput{}, false},
		{"merged", ModerationInput{TargetID: "target"}, true},
		{"approved", ModerationInput{TargetID: "target"}, false},
		{"rejected", ModerationInput{Reason: "Текст\x00"}, false},
		{"unknown", ModerationInput{}, false},
	}
	for _, tc := range cases {
		_, err := NormalizeModeration(tc.action, tc.in)
		if (err == nil) != tc.ok {
			t.Errorf("%s: %v", tc.action, err)
		}
	}
}
