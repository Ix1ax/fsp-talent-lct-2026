import type { DisciplineKind } from '../model';
import {
  AlgorithmVisual,
  DroneVisual,
  ProductVisual,
  RobotVisual,
  SecurityVisual,
} from './disciplines';

interface DisciplineVisualProps {
  kind: DisciplineKind;
}

const VISUALS = {
  product: ProductVisual,
  algorithm: AlgorithmVisual,
  security: SecurityVisual,
  robot: RobotVisual,
  drone: DroneVisual,
} satisfies Record<DisciplineKind, typeof ProductVisual>;

export const DisciplineVisual = ({ kind }: DisciplineVisualProps) => {
  const Visual = VISUALS[kind];

  return <Visual />;
};
