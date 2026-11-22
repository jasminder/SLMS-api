/**
 * Scope of Work B1 (phase 1): the label shown next to an invoice's status pill says HOW it was settled.
 * The status itself never changes. Rows below are shaped like the live data (Nov 2026, current term).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const FILE = 'service/finance.settlement.service/invoice.settlement.rules.ts';
const { describeSettlement } = await createLoader([FILE])(FILE);

const pay = (paymentMethod, paidAmount, isTransactionSucess = true) => ({ paymentMethod, paidAmount, isTransactionSucess });
const invoice = (over) => ({ status: 'PAID', feeAmount: 50, dueAmount: 0, discountAmount: 0, installments: [], ...over });

describe('Paid invoices keep "Paid" and say how', () => {
    it('paid in full with money: "in full"', () => {
        const s = describeSettlement(invoice({ installments: [pay('ONLINE', 50)] }));
        assert.deepEqual(s, { label: 'in full', originalAmount: 50, paidAmount: 50, waivedAmount: 0, outstandingAmount: 0 });
    });
    it('the office wrote off the whole invoice (live: invoice 4773): "waived in full", nothing received', () => {
        const s = describeSettlement(invoice({ discountAmount: 50, installments: [pay('DISCOUNT', 50)] }));
        assert.equal(s.label, 'waived in full');
        assert.equal(s.paidAmount, 0);
        assert.equal(s.waivedAmount, 50);
    });
    it('half waived, half paid (live: invoice 4528): "part waived", shows $50 -> $25 paid, $25 waived', () => {
        const s = describeSettlement(invoice({ discountAmount: 25, installments: [pay('DISCOUNT', 25), pay('OTHER', 25)] }));
        assert.deepEqual(s, { label: 'part waived', originalAmount: 50, paidAmount: 25, waivedAmount: 25, outstandingAmount: 0 });
    });
    it('a discount stored only on the invoice (no DISCOUNT row) still counts as waived', () => {
        assert.equal(describeSettlement(invoice({ discountAmount: 50 })).label, 'waived in full');
    });
    it('the waived amount is not counted twice when it is on the invoice AND in a DISCOUNT row', () => {
        assert.equal(describeSettlement(invoice({ discountAmount: 25, installments: [pay('DISCOUNT', 25), pay('CASH', 25)] })).waivedAmount, 25);
    });
    it('a failed online payment is not money received', () => {
        const s = describeSettlement(invoice({ installments: [pay('ONLINE', 50, false), pay('CASH', 50)] }));
        assert.equal(s.paidAmount, 50);
        assert.equal(s.label, 'in full');
    });
});

describe('unpaid invoices only get a label when something has happened', () => {
    it('nothing paid, nothing waived: no label', () => {
        assert.equal(describeSettlement(invoice({ status: 'OVERDUE', dueAmount: 50 })).label, null);
    });
    it('some money in, balance still owing: "part paid"', () => {
        const s = describeSettlement(invoice({ status: 'OVERDUE', dueAmount: 30, installments: [pay('CASH', 20)] }));
        assert.equal(s.label, 'part paid');
        assert.equal(s.outstandingAmount, 30);
    });
    it('part written down, rest still owing (live: invoice 4775): "part waived", status stays Overdue', () => {
        const s = describeSettlement(invoice({ status: 'OVERDUE', dueAmount: 25, discountAmount: 25, installments: [pay('DISCOUNT', 25)] }));
        assert.equal(s.label, 'part waived');
        assert.equal(s.outstandingAmount, 25);
    });
    it('nothing left to pay but the status was never moved to Paid: "waived in full"', () => {
        assert.equal(describeSettlement(invoice({ status: 'PENDING', dueAmount: 0, discountAmount: 50, installments: [pay('DISCOUNT', 50)] })).label, 'waived in full');
    });
});
