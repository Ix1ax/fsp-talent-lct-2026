export type CandidateEducation = {
  id: string;
  level: string;
  institution: string;
  specialty: string;
  graduationYear: number;
  createdAt: string;
  updatedAt: string;
};

export type CandidateEducations = {
  items: CandidateEducation[];
};
