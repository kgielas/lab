import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { mergeClasses, Subtitle1, Tab, TabList, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowSwapRegular, BoxRegular, LocationRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: tokens.colorNeutralBackground2 },
  header: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1 },
  headerInner: { maxWidth: '1480px', width: '100%', marginInline: 'auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '30px', minHeight: '64px', boxSizing: 'border-box', '@media (max-width: 620px)': { padding: '0 12px', gap: '16px', flexWrap: 'wrap', minHeight: 'auto' } },
  brand: { flexShrink: 0 },
  tabs: { overflowX: 'auto', minWidth: 0, flex: 1, '@media (max-width: 620px)': { width: '100%', flexBasis: '100%' } },
  tab: { flexShrink: 0 },
  main: { flex: 1, width: '100%', maxWidth: '1480px', marginInline: 'auto', boxSizing: 'border-box', padding: '26px 24px', '@media (max-width: 620px)': { padding: '16px 12px' } },
});

const destinations = [
  { path: '/items', label: 'Items', icon: <BoxRegular /> },
  { path: '/transactions', label: 'Transactions', icon: <ArrowSwapRegular /> },
  { path: '/locations', label: 'Locations', icon: <LocationRegular /> },
];

export default function Layout() {
  const styles = useStyles();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const selected = pathname.startsWith('/items') ? '/items' : pathname.startsWith('/transactions') ? '/transactions' : '/locations';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Subtitle1 className={styles.brand}>Warehouse Picking</Subtitle1>
          <TabList className={styles.tabs} selectedValue={selected}>
            {destinations.map((destination) => (
              <Tab
                key={destination.path}
                value={destination.path}
                icon={destination.icon}
                className={styles.tab}
                onClick={() => navigate(destination.path)}
              >
                {destination.label}
              </Tab>
            ))}
          </TabList>
        </div>
      </header>
      <main className={mergeClasses(styles.main)}><Outlet /></main>
    </div>
  );
}