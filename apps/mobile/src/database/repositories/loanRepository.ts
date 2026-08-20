import {
  calculateLoanInterest,
  evaluateKinsenaPayment,
  type Loan,
  type LoanPayment,
  type LoanStatus,
  type LoanType,
} from '@perakita/shared';
import { getDatabase, nowIso } from '../database';
import { createSyncFields, enqueueSync, newId } from './baseRepository';
import { transactionRepository } from './transactionRepository';

function mapLoan(row: Record<string, unknown>): Loan {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    person_name: row.person_name as string,
    person_contact: (row.person_contact as string) ?? null,
    loan_type: row.loan_type as LoanType,
    principal_amount: row.principal_amount as number,
    interest_rate: row.interest_rate as number,
    total_amount: row.total_amount as number,
    amount_paid: row.amount_paid as number,
    remaining_amount: row.remaining_amount as number,
    start_date: (row.start_date as string) ?? null,
    due_date: (row.due_date as string) ?? null,
    payment_frequency: (row.payment_frequency as string) ?? null,
    status: row.status as LoanStatus,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as Loan['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

function mapPayment(row: Record<string, unknown>): LoanPayment {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    loan_id: row.loan_id as string,
    amount: row.amount as number,
    payment_date: row.payment_date as string,
    payment_method: (row.payment_method as string) ?? null,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) ?? null,
    sync_status: row.sync_status as LoanPayment['sync_status'],
    last_synced_at: (row.last_synced_at as string) ?? null,
    device_id: (row.device_id as string) ?? null,
    version: row.version as number,
  };
}

function statusFor(paid: number, total: number): LoanStatus {
  if (paid <= 0) return 'active';
  if (paid >= total) return 'paid';
  return 'partially_paid';
}

export const loanRepository = {
  async findAll(userId: string): Promise<Loan[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM loans WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
      [userId]
    );
    return rows.map(mapLoan);
  },

  async findById(userId: string, id: string): Promise<Loan | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM loans WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return row ? mapLoan(row) : null;
  },

  async totals(userId: string): Promise<{ debts: number; receivables: number }> {
    const db = await getDatabase();
    const debts = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) as total FROM loans
       WHERE user_id = ? AND deleted_at IS NULL AND loan_type = 'debt' AND status != 'cancelled'`,
      [userId]
    );
    const receivables = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) as total FROM loans
       WHERE user_id = ? AND deleted_at IS NULL AND loan_type = 'receivable' AND status != 'cancelled'`,
      [userId]
    );
    return { debts: debts?.total ?? 0, receivables: receivables?.total ?? 0 };
  },

  async create(
    userId: string,
    data: {
      person_name: string;
      loan_type: LoanType;
      amount: number;
      interest_rate?: number;
      start_date?: string | null;
      due_date?: string | null;
      notes?: string | null;
      account_id: string;
    }
  ): Promise<Loan> {
    const db = await getDatabase();
    const id = newId();
    const now = nowIso();
    const sync = createSyncFields('pending');
    const { principal, interestRate, total } = calculateLoanInterest(
      data.amount,
      data.interest_rate ?? 0,
      { startDate: data.start_date, dueDate: data.due_date }
    );
    const startDate = data.start_date || now.slice(0, 10);
    const loan: Loan = {
      id,
      user_id: userId,
      person_name: data.person_name,
      person_contact: null,
      loan_type: data.loan_type,
      principal_amount: principal,
      interest_rate: interestRate,
      total_amount: total,
      amount_paid: 0,
      remaining_amount: total,
      start_date: startDate,
      due_date: data.due_date ?? null,
      payment_frequency: 'kinsena',
      status: 'active',
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      ...sync,
    };

    await db.runAsync(
      `INSERT INTO loans (
        id, user_id, person_name, person_contact, loan_type, principal_amount, interest_rate,
        total_amount, amount_paid, remaining_amount, start_date, due_date, payment_frequency,
        status, notes, created_at, updated_at, deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?, 'kinsena', 'active', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.person_name,
        data.loan_type,
        principal,
        interestRate,
        total,
        total,
        startDate,
        data.due_date ?? null,
        data.notes ?? null,
        now,
        now,
        sync.deleted_at,
        sync.sync_status,
        sync.last_synced_at,
        sync.device_id,
        sync.version,
      ]
    );

    await enqueueSync('loans', id, 'CREATE', loan as unknown as Record<string, unknown>);
    await transactionRepository.create(userId, {
      account_id: data.account_id,
      category_id: null,
      type: data.loan_type === 'debt' ? 'loan_received' : 'loan_given',
      amount: principal,
      description:
        data.loan_type === 'debt'
          ? `Borrowed from ${data.person_name}`
          : `Lent to ${data.person_name}`,
      notes: 'Loan record — not included in current balance',
      transaction_date: startDate,
    });
    return loan;
  },

  async findPayments(userId: string, loanId: string): Promise<LoanPayment[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM loan_payments
       WHERE user_id = ? AND loan_id = ? AND deleted_at IS NULL
       ORDER BY payment_date ASC, created_at ASC`,
      [userId, loanId]
    );
    return rows.map(mapPayment);
  },

  async findAllPayments(userId: string): Promise<LoanPayment[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM loan_payments
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY payment_date ASC, created_at ASC`,
      [userId]
    );
    return rows.map(mapPayment);
  },

  async softDelete(userId: string, loanId: string): Promise<void> {
    const db = await getDatabase();
    const now = nowIso();
    await db.runAsync(
      `UPDATE loans SET deleted_at = ?, updated_at = ?, sync_status = 'deleted', version = version + 1
       WHERE id = ? AND user_id = ?`,
      [now, now, loanId, userId]
    );
    await enqueueSync('loans', loanId, 'DELETE', { id: loanId, deleted_at: now });
  },

  async recordPayment(
    userId: string,
    loanId: string,
    amount: number,
    accountId: string,
    paymentDate: string,
    paymentMethod: string
  ): Promise<void> {
    const db = await getDatabase();
    const loanRow = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM loans WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [loanId, userId]
    );
    if (!loanRow) throw new Error('Loan not found');
    const loan = mapLoan(loanRow);
    if (loan.status === 'paid' || loan.status === 'cancelled') {
      throw new Error('This loan is already closed.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Enter a payment greater than zero.');
    }

    const kinsena = evaluateKinsenaPayment(paymentDate, loan.remaining_amount, loan.interest_rate);
    const penalty = kinsena.penalty;
    const billedTotal = loan.total_amount + penalty;
    const remainingAfterPenalty = loan.remaining_amount + penalty;
    const payment = Math.min(amount, remainingAfterPenalty);
    const nextPaid = Math.min(billedTotal, loan.amount_paid + payment);
    const remaining = Math.max(0, billedTotal - nextPaid);
    const now = nowIso();
    const status = statusFor(nextPaid, billedTotal);
    const method = paymentMethod.trim() || 'Cash';
    const notes = kinsena.late
      ? `Via ${method}. Paid ${payment} on ${paymentDate}. Late after 5-day allowance from ${kinsena.periodLabel} (due ${kinsena.dueDate}, grace until ${kinsena.graceEnds}). Penalty ${penalty} at ${loan.interest_rate}%.`
      : `Via ${method}. Paid ${payment} on ${paymentDate}. On time for ${kinsena.periodLabel ?? 'kinsena'} (due ${kinsena.dueDate ?? 'n/a'}, grace until ${kinsena.graceEnds ?? 'n/a'}).`;

    await db.runAsync(
      `UPDATE loans SET total_amount = ?, amount_paid = ?, remaining_amount = ?, status = ?, updated_at = ?,
       sync_status = 'updated', version = version + 1 WHERE id = ?`,
      [billedTotal, nextPaid, remaining, status, now, loanId]
    );

    const paymentId = newId();
    await db.runAsync(
      `INSERT INTO loan_payments (
        id, user_id, loan_id, amount, payment_date, payment_method, notes, created_at, updated_at,
        deleted_at, sync_status, last_synced_at, device_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NULL, NULL, 1)`,
      [paymentId, userId, loanId, payment, paymentDate, method, notes, now, now]
    );
    await enqueueSync('loan_payments', paymentId, 'CREATE', {
      id: paymentId,
      user_id: userId,
      loan_id: loanId,
      amount: payment,
      payment_date: paymentDate,
      notes,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
      version: 1,
    });

    await enqueueSync('loans', loanId, 'UPDATE', {
      ...loan,
      total_amount: billedTotal,
      amount_paid: nextPaid,
      remaining_amount: remaining,
      status,
    } as unknown as Record<string, unknown>);

    await transactionRepository.create(userId, {
      account_id: accountId,
      category_id: null,
      type: loan.loan_type === 'debt' ? 'debt_payment' : 'loan_received',
      amount: payment,
      description:
        loan.loan_type === 'debt'
          ? `Paid ${loan.person_name} via ${method}`
          : `Collected from ${loan.person_name} via ${method}`,
      notes,
      transaction_date: paymentDate,
    });
  },
};
