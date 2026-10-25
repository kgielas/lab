import { Form, useField } from '@talxis/base-controls';
import { RequiredLevelEnum } from '@talxis/client-metadata';
import type { IColumn } from '@talxis/client-libraries';
import { RecordLookup, type LookupRecord } from '@/components/RecordLookup';

export type FormField = {
  column: IColumn;
  required?: boolean;
  disabled?: boolean;
  lookupEntity?: string;
};

type RecordFormFieldsProps = {
  fields: FormField[];
  lookupRecords?: Record<string, LookupRecord[]>;
  columnCount?: number;
  sectionLabel?: string;
};

export function RecordFormFields({ fields, lookupRecords = {}, columnCount = 1, sectionLabel }: RecordFormFieldsProps) {
  const perColumn = Math.ceil(fields.length / columnCount);
  const groups = Array.from({ length: columnCount }, (_, index) => fields.slice(index * perColumn, (index + 1) * perColumn));
  const layout = { lg: columnCount, md: Math.min(columnCount, 2), sm: 1, xs: 1 };

  return (
    <Form.Section label={sectionLabel} showLabel={!!sectionLabel} showBar={!!sectionLabel} layout={layout}>
      {groups.map((group, index) => (
        <Form.Column key={index}>
          {group.map(({ column, required, disabled, lookupEntity }) => {
            const level = required ? RequiredLevelEnum.ApplicationRequired : RequiredLevelEnum.None;
            return (
              <Form.Field key={column.name} name={column.name} requiredLevel={level}>
                <Form.Cell requiredLevel={level}>
                  {lookupEntity ? (
                    <Form.Control components={{
                      onRenderControl: () => (
                        <LookupFieldControl entityName={lookupEntity} records={lookupRecords[column.name] ?? []} required={required} />
                      ),
                    }} />
                  ) : (
                    <Form.Control disabled={disabled} />
                  )}
                </Form.Cell>
              </Form.Field>
            );
          })}
        </Form.Column>
      ))}
    </Form.Section>
  );
}

function LookupFieldControl({ entityName, records, required }: { entityName: string; records: LookupRecord[]; required?: boolean }) {
  const field = useField();
  return (
    <RecordLookup
      entityName={entityName}
      records={records}
      value={String(field?.getValue() ?? '')}
      onChange={(id) => field?.setValue(id || null)}
      required={required}
    />
  );
}