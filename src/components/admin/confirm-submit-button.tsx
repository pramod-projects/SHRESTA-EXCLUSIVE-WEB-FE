"use client";

export function ConfirmSubmitButton({
  message,
  className,
  disabled,
  title,
  children,
}: {
  message: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        if (disabled) {
          return;
        }
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
