export interface CatalogItem {
  id: number;
  code: string;
  name: string;
}

export interface Grade extends CatalogItem {
  rank: number;
}

export interface Catalogs {
  specializations: CatalogItem[];
  grades: Grade[];
  workFormats: CatalogItem[];
}

export interface Skill {
  id: string;
  code: string;
  name: string;
  aliases: string[];
}

export interface SkillsPage {
  items: Skill[];
  limit: number;
  offset: number;
}
