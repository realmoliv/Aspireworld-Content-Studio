import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, required = false, children, className = '' }: FieldProps) {
  return (
    <label className={`field ${className}`}>
      <span>
        {label}
        {required && <b> REQUIRED</b>}
      </span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input textarea ${props.className || ''}`} />;
}

export function Select({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`input ${className}`}>
      {children}
    </select>
  );
}

export function Pill({ children, tone = '', className = '', ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return <span className={`pill ${tone} ${className}`} {...props}>{children}</span>;
}

interface SectionTitleProps {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}

export function SectionTitle({ eyebrow, title, action }: SectionTitleProps) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

interface EmptyProps {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}

export function Empty({ title, text, action, onClick }: EmptyProps) {
  return (
    <div className="empty">
      <span className="empty-index">00</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Button onClick={onClick}>{action}</Button>
    </div>
  );
}
