'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

export function MobileAutoCloseLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} onClick={(event) => {
    props.onClick?.(event);
    const menu = event.currentTarget.closest('.dashboardMobileMenu') as HTMLDetailsElement | null;
    if (menu) menu.open = false;
  }} />;
}
