export const AdminBackground = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden"
  >
    <div className="absolute -inset-2 blur-[3px] bg-[url('/brand/scout-mark-on-light.svg')] bg-size-[300px_350px] bg-repeat opacity-[0.035] dark:hidden" />
    <div className="absolute -inset-2 hidden blur-[3px] bg-[url('/brand/scout-mark.svg')] bg-size-[300px_350px] bg-repeat opacity-[0.015] dark:block" />
  </div>
);
