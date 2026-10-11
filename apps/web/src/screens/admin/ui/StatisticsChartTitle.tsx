interface StatisticsChartTitleProps {
  title: string;
  description: string;
}
export const StatisticsChartTitle = ({
  title,
  description,
}: StatisticsChartTitleProps) => {
  return (
    <div>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
};
