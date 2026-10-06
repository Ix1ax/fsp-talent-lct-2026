import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import type { CatalogItem } from '@/entities/catalog';

interface CatalogCardProps {
  title: string;
  items: CatalogItem[];
}

export const CatalogCard = ({ title, items }: CatalogCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Badge
                variant="secondary"
                className="h-auto min-h-7 px-3 py-1 text-sm"
              >
                {item.name}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
