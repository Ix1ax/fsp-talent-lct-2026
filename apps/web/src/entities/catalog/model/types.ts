export type CatalogItem = {
  id: number;
  code: string;
  name: string;
};

export type Grade = CatalogItem & {
  rank: number;
};

export type Catalogs = {
  specializations: CatalogItem[];
  grades: Grade[];
  workFormats: CatalogItem[];
};

export type Skill = {
  id: string;
  code: string;
  name: string;
  aliases: string[];
};

export type SkillsPage = {
  items: Skill[];
  limit: number;
  offset: number;
};
