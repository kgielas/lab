import { useMemo, useRef, type FormEvent, type ReactNode } from 'react';
import { Form, useForm, type IFormStrategy } from '@talxis/base-controls';
import type { IColumn } from '@talxis/client-libraries';
import { getEntity } from '@/providers/pcf-host';

type RecordFormProps = {
  entityName: string;
  columns: IColumn[];
  record?: { id: string; values: Record<string, unknown> };
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
  onSaved?: () => void;
  children: ReactNode;
};

export function RecordForm({ entityName, columns, record, onSave, onSaved, children }: RecordFormProps) {
  const entity = getEntity(entityName);
  if (!entity) throw new Error(`RecordForm: '${entityName}' is not registered.`);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const strategy = useMemo<IFormStrategy>(() => ({
    onLoad: async () => ({
      columns,
      data: { ...record?.values, [entity.primaryIdAttribute]: record?.id ?? crypto.randomUUID() },
      metadata: { PrimaryIdAttribute: entity.primaryIdAttribute, PrimaryNameAttribute: entity.primaryNameAttribute },
    }),
    onSave: async ({ recordId, updatedData }) => {
      try {
        await onSaveRef.current(updatedData);
        return { recordId, success: true, fields: [] };
      } catch {
        return { recordId, success: false, fields: [] };
      }
    },
  }), [columns, entity, record]);

  return <Form.Root strategy={strategy} onAfterSave={({ success }) => success && onSaved?.()}><FormBody>{children}</FormBody></Form.Root>;
}

function FormBody({ children }: { children: ReactNode }) {
  const form = useForm();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur?.();
    setTimeout(() => void form.save(), 0);
  };
  return <form onSubmit={onSubmit}>{children}</form>;
}