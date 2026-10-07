package entity

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

type ModerationInput struct {
	TargetID string `json:"target_id,omitempty"`
	Reason   string `json:"reason,omitempty"`
}
type ModerationResult struct {
	Skill          Item `json:"skill"`
	CandidateLinks int  `json:"candidate_links"`
	NeedLinks      int  `json:"need_links"`
	DraftedNeeds   int  `json:"drafted_needs"`
}

func NormalizeModeration(action string, in ModerationInput) (ModerationInput, error) {
	switch action {
	case "approved", "rejected", "merged":
	default:
		return in, ErrInvalidTransition
	}
	in.Reason = strings.TrimSpace(in.Reason)
	if utf8.RuneCountInString(in.Reason) > 1000 {
		return in, &ValidationError{"Причина не должна превышать 1000 символов"}
	}
	for _, r := range in.Reason {
		if unicode.IsControl(r) && r != '\n' && r != '\t' {
			return in, &ValidationError{"Причина содержит недопустимые символы"}
		}
	}
	if action == "rejected" && in.Reason == "" {
		return in, &ValidationError{"Укажите причину отклонения"}
	}
	if action != "merged" && in.TargetID != "" {
		return in, &ValidationError{"Целевой навык нужен только при объединении"}
	}
	if action == "merged" && in.TargetID == "" {
		return in, &ValidationError{"Укажите target_id одобренного навыка"}
	}
	return in, nil
}
