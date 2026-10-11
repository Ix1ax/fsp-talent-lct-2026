import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import type { CatalogItem } from '@/entities/catalog';

interface CatalogCardProps {
  title: string;
  items: CatalogItem[];
}

export const CatalogCard = ({ title, items }: CatalogCardProps) => {
  return (
    <Card className="border border-border ring-0">
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id} className="min-w-0 max-w-full">
              <Badge
                variant="outline"
                className="h-auto min-h-8 max-w-full px-2 py-1 text-sm whitespace-normal wrap-anywhere"
              >
                {item.name}
              </Badge>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Пока нет значений.</p>
        )}
      </CardContent>
    </Card>
  );
};
