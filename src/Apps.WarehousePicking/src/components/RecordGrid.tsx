import { useCallback, useEffect, useRef, useState } from 'react';
import { Grid, NestedControlRenderer, usePcfContext } from '@talxis/base-controls';
import { Dataset, DatasetConstants, MemoryDataProvider, type ICommand, type IColumn, type IRawRecord } from '@talxis/client-libraries';
import { getEntity } from '@/providers/pcf-host';
import { useToast } from '@/hooks/use-toast';

type GridCommand = { id: string; label: string; icon: string; onExecute: () => unknown };
type RecordGridProps = {
  rows: IRawRecord[] | undefined;
  columns: IColumn[];
  entityName: string;
  commands?: GridCommand[];
  onRefresh?: () => unknown;
};

function toCommand({ id, label, icon, onExecute }: GridCommand): ICommand {
  return {
    commandId: id,
    commandButtonId: id,
    label,
    tooltip: label,
    icon,
    canExecute: true,
    shouldBeVisible: true,
    children: [],
    controlType: '',
    execute: async () => { await onExecute(); },
  };
}

export function RecordGrid({ rows, columns, entityName, commands, onRefresh }: RecordGridProps) {
  const context = usePcfContext();
  const entity = getEntity(entityName);
  const toast = useToast();
  if (!entity) throw new Error(`RecordGrid: '${entityName}' is not registered.`);

  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const showRibbon = !!commands || !!onRefresh;

  const [dataset] = useState(() => {
    const metadata = {
      LogicalName: entity.logicalName,
      PrimaryIdAttribute: entity.primaryIdAttribute,
      PrimaryNameAttribute: entity.primaryNameAttribute,
    };
    const data = new Dataset(new MemoryDataProvider({ dataSource: [], metadata }));
    data.setColumns(columns);
    data.setInterceptor('onOpenDatasetItem', (entityReference) => {
      if (!entity.formPath) return;
      context.navigation.openForm({ entityName: entity.logicalName, entityId: entityReference.id.guid })
        .catch((error) => toast.error(String(error)));
    });
    data.setInterceptor('onRetrieveRecordCommand', async (options, defaultAction) => {
      const defaults = await defaultAction(options);
      const standard = defaults.map((command) =>
        command.commandId === DatasetConstants.REFRESH_COMMAND_ID && refreshRef.current
          ? { ...command, execute: async () => void (await refreshRef.current?.()) }
          : command
      );
      return [...(commandsRef.current ?? []).map(toCommand), ...standard];
    });
    return data;
  });

  const [ribbonCommands, setRibbonCommands] = useState<ICommand[] | null>(null);
  const loadRibbonCommands = useCallback(() => {
    void dataset.retrieveRecordCommand([], [], false, false, false).then(setRibbonCommands);
  }, [dataset]);

  useEffect(() => {
    if (!rows) return;
    dataset.setDataSource(rows);
    void dataset.refresh();
  }, [dataset, rows]);
  useEffect(() => {
    if (showRibbon) loadRibbonCommands();
  }, [showRibbon, loadRibbonCommands]);

  const grid = (
    <div style={{ height: 'min(62vh, 560px)', minHeight: '340px', width: '100%' }}>
      <Grid context={context} parameters={{ Grid: dataset, SelectableRows: { raw: 'none' }, EnableNavigation: { raw: !!entity.formPath }, EnableOptionSetColors: { raw: true } }} />
    </div>
  );
  if (!showRibbon) return grid;

  return (
    <div>
      <NestedControlRenderer context={context} parameters={{ ControlName: 'Ribbon', Bindings: { Commands: { type: 'Object', value: ribbonCommands ?? [], isStatic: true }, Loading: { type: 'TwoOptions', value: ribbonCommands === null, isStatic: true } } }} />
      {grid}
    </div>
  );
}