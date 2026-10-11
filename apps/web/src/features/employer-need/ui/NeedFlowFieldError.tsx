interface NeedFlowFieldErrorProps {
  errors: Record<string, string>;
  name: string;
}
export const NeedFlowFieldError = ({
  errors,
  name,
}: NeedFlowFieldErrorProps) => {
  if (!errors[name]) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {errors[name]}
    </p>
  );
};
