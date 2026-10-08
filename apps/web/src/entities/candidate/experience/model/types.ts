export type CandidateExperience = {
  id: string;
  company: string;
  position: string;
  startedOn: string;
  endedOn: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateExperiences = {
  items: CandidateExperience[];
};
