

// @ts-nocheck
// This file must be .tsx for JSX parsing

// MVP: Only support shadcn/tailwind primitives, no dynamic className interpolation

const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      {...props}
    >
      {children}
    </button>
  );
};

const Card: React.FC<CardProps> = ({ children, title, description }) => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        {title && (
          <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>
        )}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-6 pt-0">{children}</div>
    </div>
  );
};

const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  );
};

const Label: React.FC<LabelProps> = ({ children, ...props }) => {
  return (
    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" {...props}>
      {children}
    </label>
  );
};

const Badge: React.FC<BadgeProps> = ({ children, ...props }) => {
  return (
    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" {...props}>
      {children}
    </div>
  );
};

export const shadcnAdapter = createAdapter({
  components: {
    Button,
    Card,
    Input,
    Label,
    Badge,
  },
});
