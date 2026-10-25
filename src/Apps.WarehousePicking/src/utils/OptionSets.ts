import { Lab_warehouseitemslab_category } from '@/generated/models/Lab_warehouseitemsModel';
import { Lab_warehousetransactionslab_transactiontype } from '@/generated/models/Lab_warehousetransactionsModel';
import type { IColumn } from '@talxis/client-libraries';

function toOptionMetadata(labels: Record<number, string>): NonNullable<IColumn['metadata']>['OptionSet'] {
  return Object.entries(labels).map(([value, label]) => ({ Value: Number(value), Label: label, Color: '' }));
}

export const categoryOptionMetadata = toOptionMetadata(Lab_warehouseitemslab_category);
export const transactionTypeOptionMetadata = toOptionMetadata(Lab_warehousetransactionslab_transactiontype);