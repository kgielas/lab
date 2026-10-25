import type { IColumn, IDataset, IRecord } from '@talxis/client-libraries';

const LOW_STOCK_FALLBACK = 10;
const LOW_STOCK_BACKGROUND = '#FDE7E9';

const initializedDatasets = new Map<string, IDataset>();
const datasetWaiters = new Map<string, ((dataset: IDataset) => void)[]>();
const anyDatasetWaiters: ((dataset: IDataset) => void)[] = [];

export class TransactionForm {
    public static onLoad(executionContext: Xrm.Events.EventContext): void {
        const formContext = executionContext.getFormContext();
        const dateAttribute = formContext.getAttribute('lab_transactiondate');
        if (dateAttribute && !dateAttribute.getValue()) {
            dateAttribute.setValue(new Date());
        }
    }

    public static async onQuantityChange(executionContext: Xrm.Events.EventContext): Promise<void> {
        const formContext = executionContext.getFormContext();
        const quantity = (formContext.getAttribute('lab_quantity') as Xrm.Attributes.NumberAttribute | null)?.getValue();
        const itemAttribute = formContext.getAttribute('lab_itemid') as Xrm.Attributes.LookupAttribute | null;
        const itemLookup = itemAttribute?.getValue();
        if (quantity == null || !itemLookup || itemLookup.length === 0) {
            return;
        }

        try {
            const item = await Xrm.WebApi.retrieveRecord(
                'lab_warehouseitem',
                itemLookup[0].id.replace(/[{}]/g, ''),
                '?$select=lab_unitprice'
            );
            const unitPrice = item.lab_unitprice as number | null | undefined;
            if (typeof unitPrice !== 'number') {
                return;
            }

            (formContext.getAttribute('lab_totalvalue') as Xrm.Attributes.NumberAttribute | null)
                ?.setValue(quantity * unitPrice);
        } catch {
            // Keep the current total when the selected item cannot be read.
        }
    }
}

export class RibbonActions {
    public static async checkStockLevels(formContext: Xrm.FormContext): Promise<void> {
        const name = (formContext.getAttribute('lab_name') as Xrm.Attributes.StringAttribute | null)?.getValue() || 'Unknown';
        const quantity = (formContext.getAttribute('lab_availablequantity') as Xrm.Attributes.NumberAttribute | null)?.getValue() ?? 0;
        const reorderPoint = (formContext.getAttribute('lab_reorderpoint') as Xrm.Attributes.NumberAttribute | null)?.getValue() ?? 0;

        let message = `Stock level for ${name}: ${quantity} units.`;
        if (quantity <= reorderPoint) {
            message += `\n⚠ Below reorder point (${reorderPoint}). Consider restocking.`;
        } else {
            message += `\n✓ Stock is above reorder point (${reorderPoint}).`;
        }

        await Xrm.Navigation.openAlertDialog({ text: message, title: 'Stock Check' });
    }
}

export class GridApi {
    public static onDatasetControlInitialized(parameters: { controlId: string; dataset: IDataset }): void {
        const { controlId, dataset } = parameters;
        initializedDatasets.set(controlId, dataset);
        datasetWaiters.get(controlId)?.forEach(resolve => resolve(dataset));
        datasetWaiters.delete(controlId);
        anyDatasetWaiters.splice(0).forEach(resolve => resolve(dataset));
        dataset.addEventListener('onDestroyed', () => initializedDatasets.delete(controlId));
        GridApi.customizeItemsGrid(dataset);
    }

    public static getDataset(controlId?: string): Promise<IDataset> {
        if (!controlId) {
            const dataset = Array.from(initializedDatasets.values())[0];
            if (dataset) {
                return Promise.resolve(dataset);
            }
            return new Promise(resolve => anyDatasetWaiters.push(resolve));
        }

        const dataset = initializedDatasets.get(controlId);
        if (dataset) {
            return Promise.resolve(dataset);
        }
        return new Promise(resolve => {
            const waiters = datasetWaiters.get(controlId) ?? [];
            waiters.push(resolve);
            datasetWaiters.set(controlId, waiters);
        });
    }

    private static customizeItemsGrid(dataset: IDataset): void {
        dataset.setInterceptor('columns', (columns: IColumn[]) => columns.map(column =>
            column.name === 'lab_availablequantity'
                ? { ...column, displayName: 'Qty on hand' }
                : column));

        dataset.addEventListener('onRecordLoaded', (record: IRecord) => {
            record.expressions?.ui.setCustomFormattingExpression('lab_availablequantity', () => {
                const quantity = record.getValue('lab_availablequantity');
                if (quantity == null) {
                    return undefined;
                }
                const reorderPoint = (record.getValue('lab_reorderpoint') as number | null) ?? LOW_STOCK_FALLBACK;
                if ((quantity as number) > reorderPoint) {
                    return undefined;
                }
                return { backgroundColor: LOW_STOCK_BACKGROUND };
            });
        });
    }
}

export class LocationForm {
    public static async onLoad(executionContext: Xrm.Events.EventContext): Promise<void> {
        const formContext = executionContext.getFormContext();
        const dataset = await GridApi.getDataset();
        const showCount = (): void => formContext.ui.setFormNotification(
            `TALXIS Grid ready — ${dataset.sortedRecordIds.length} warehouse item(s) loaded`,
            'INFO',
            'talxisgrid'
        );

        dataset.addEventListener('onFirstDataLoaded', showCount);
        if (dataset.sortedRecordIds.length > 0) {
            showCount();
        }
    }
}
