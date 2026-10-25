import type { ReactNode } from 'react';
import { Body1, Title2 } from '@fluentui/react-components';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: { display: 'flex', alignItems: 'center', gap: '14px' },
  icon: {
    width: '42px',
    height: '42px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: '22px',
  },
  copy: { display: 'grid', gap: '2px' },
  subtitle: { color: tokens.colorNeutralForeground3 },
});

export function PageHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.copy}>
        <Title2>{title}</Title2>
        {subtitle && <Body1 className={styles.subtitle}>{subtitle}</Body1>}
      </div>
    </div>
  );
}