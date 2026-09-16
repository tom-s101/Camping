import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Shared = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

type AsLink = Shared &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & { href: string };

type AsButton = Shared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type Props = AsLink | AsButton;

const WRAPPER_CLASS =
  "liquid-metal-wrapper group relative isolate inline-flex overflow-hidden p-[2px] disabled:cursor-not-allowed disabled:opacity-40";
const SURFACE_CLASS =
  "liquid-metal-surface relative z-[1] flex w-full items-center justify-center text-sm font-semibold text-white transition-transform group-active:scale-[0.98]";

function Beams() {
  return (
    <>
      <span className="liquid-metal-beam absolute inset-[-60%]" aria-hidden="true" />
      <span className="liquid-metal-beam liquid-metal-beam--slow absolute inset-[-60%]" aria-hidden="true" />
    </>
  );
}

export default function LiquidMetalButton({ children, className = "", innerClassName = "", ...rest }: Props) {
  const surface = <span className={`${SURFACE_CLASS} ${innerClassName}`}>{children}</span>;

  if (rest.href) {
    const { href, ...anchorProps } = rest as AsLink;
    return (
      <Link href={href} className={`${WRAPPER_CLASS} ${className}`} {...anchorProps}>
        <Beams />
        {surface}
      </Link>
    );
  }

  return (
    <button className={`${WRAPPER_CLASS} ${className}`} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      <Beams />
      {surface}
    </button>
  );
}
