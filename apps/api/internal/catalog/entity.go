// Пакет catalog содержит общие справочники работодателей и соискателей.
package catalog

type CatalogItem struct {
	ID   int16  `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}
type CatalogGrade struct {
	CatalogItem
	Rank int16 `json:"rank"`
}
type CatalogSkill struct {
	ID      string   `json:"id"`
	Code    string   `json:"code"`
	Name    string   `json:"name"`
	Aliases []string `json:"aliases"`
}
type Catalogs struct {
	Specializations []CatalogItem  `json:"specializations"`
	Grades          []CatalogGrade `json:"grades"`
	WorkFormats     []CatalogItem  `json:"work_formats"`
}
