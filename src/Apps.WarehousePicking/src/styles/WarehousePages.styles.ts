import { makeStyles, tokens } from '@fluentui/react-components';

export const useWarehousePageStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  actions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  grid: { width: '100%', minWidth: 0 },
  message: { maxWidth: '100%' },
  section: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  sectionTitle: { margin: 0 },
  details: { display: 'flex', flexDirection: 'column', gap: '18px', padding: '18px', border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground1 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px' },
});