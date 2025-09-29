import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { progressPayments } from '@shared/schema';

export interface ProgressPaymentSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalContractValue: number;
  totalBilledAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  averageProgress: number;
}

export interface ProjectStatus {
  id: string;
  projectName: string;
  projectType: string;
  contractValue: number;
  progressPercentage: number;
  billedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  daysRemaining?: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Create a new progress payment project
 */
export async function createProgressPayment(
  userId: string,
  projectData: {
    projectName: string;
    projectType: string;
    contractValue: number;
    currency?: string;
    startDate?: Date;
    expectedCompletionDate?: Date;
  }
) {
  const newProject = {
    userId,
    projectName: projectData.projectName,
    projectType: projectData.projectType,
    contractValue: projectData.contractValue.toString(),
    currency: projectData.currency || 'TRY',
    startDate: projectData.startDate,
    expectedCompletionDate: projectData.expectedCompletionDate,
    progressPercentage: '0',
    billedAmount: '0',
    paidAmount: '0',
    pendingAmount: '0',
  };

  const [created] = await db.insert(progressPayments).values(newProject).returning();
  return created;
}

/**
 * Update project progress
 */
export async function updateProjectProgress(
  projectId: string,
  userId: string,
  updates: {
    progressPercentage?: number;
    billedAmount?: number;
    paidAmount?: number;
    actualCompletionDate?: Date;
  }
) {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (updates.progressPercentage !== undefined) {
    updateData.progressPercentage = updates.progressPercentage.toString();
  }

  if (updates.billedAmount !== undefined) {
    updateData.billedAmount = updates.billedAmount.toString();
  }

  if (updates.paidAmount !== undefined) {
    updateData.paidAmount = updates.paidAmount.toString();
  }

  if (updates.actualCompletionDate) {
    updateData.actualCompletionDate = updates.actualCompletionDate;
    updateData.status = 'completed';
  }

  // Calculate pending amount
  const currentProject = await db
    .select()
    .from(progressPayments)
    .where(and(eq(progressPayments.id, projectId), eq(progressPayments.userId, userId)))
    .limit(1);

  if (currentProject.length > 0) {
    const contractValue = parseFloat(currentProject[0].contractValue);
    const billedAmount = updates.billedAmount !== undefined ? updates.billedAmount : parseFloat(currentProject[0].billedAmount);
    const paidAmount = updates.paidAmount !== undefined ? updates.paidAmount : parseFloat(currentProject[0].paidAmount);
    
    updateData.pendingAmount = (billedAmount - paidAmount).toString();
  }

  const [updated] = await db
    .update(progressPayments)
    .set(updateData)
    .where(and(eq(progressPayments.id, projectId), eq(progressPayments.userId, userId)))
    .returning();

  return updated;
}

/**
 * Get progress payment summary
 */
export async function getProgressPaymentSummary(userId: string): Promise<ProgressPaymentSummary> {
  const projects = await db
    .select()
    .from(progressPayments)
    .where(eq(progressPayments.userId, userId));

  const summary: ProgressPaymentSummary = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    totalContractValue: 0,
    totalBilledAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
    averageProgress: 0,
  };

  let totalProgress = 0;

  projects.forEach(project => {
    summary.totalContractValue += parseFloat(project.contractValue);
    summary.totalBilledAmount += parseFloat(project.billedAmount);
    summary.totalPaidAmount += parseFloat(project.paidAmount);
    summary.totalPendingAmount += parseFloat(project.pendingAmount);
    totalProgress += parseFloat(project.progressPercentage);
  });

  summary.averageProgress = projects.length > 0 ? totalProgress / projects.length : 0;

  return summary;
}

/**
 * Get project status with risk assessment
 */
export async function getProjectStatuses(userId: string): Promise<ProjectStatus[]> {
  const projects = await db
    .select()
    .from(progressPayments)
    .where(eq(progressPayments.userId, userId));

  const now = new Date();

  return projects.map(project => {
    const contractValue = parseFloat(project.contractValue);
    const billedAmount = parseFloat(project.billedAmount);
    const paidAmount = parseFloat(project.paidAmount);
    const pendingAmount = parseFloat(project.pendingAmount);
    const progressPercentage = parseFloat(project.progressPercentage);

    // Calculate days remaining
    let daysRemaining: number | undefined;
    if (project.expectedCompletionDate && project.status === 'active') {
      daysRemaining = Math.floor((project.expectedCompletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // High risk factors
    if (
      daysRemaining !== undefined && daysRemaining < 30 && progressPercentage < 80 ||
      pendingAmount > contractValue * 0.3 ||
      progressPercentage > 100
    ) {
      riskLevel = 'high';
    }
    // Medium risk factors
    else if (
      daysRemaining !== undefined && daysRemaining < 60 && progressPercentage < 90 ||
      pendingAmount > contractValue * 0.2 ||
      progressPercentage < 50 && daysRemaining !== undefined && daysRemaining < 90
    ) {
      riskLevel = 'medium';
    }

    return {
      id: project.id,
      projectName: project.projectName,
      projectType: project.projectType,
      contractValue,
      progressPercentage,
      billedAmount,
      paidAmount,
      pendingAmount,
      status: project.status,
      daysRemaining,
      riskLevel,
    };
  });
}

/**
 * Generate progress payment invoice
 */
export async function generateProgressInvoice(
  projectId: string,
  userId: string,
  invoiceData: {
    progressPercentage: number;
    billedAmount: number;
    description?: string;
  }
) {
  // Update project with new billing
  await updateProjectProgress(projectId, userId, {
    progressPercentage: invoiceData.progressPercentage,
    billedAmount: invoiceData.billedAmount,
  });

  // TODO Tolga'dan teyit al - Generate actual invoice document
  return {
    invoiceNumber: `PP-${projectId.substring(0, 8).toUpperCase()}-${Date.now()}`,
    projectId,
    progressPercentage: invoiceData.progressPercentage,
    billedAmount: invoiceData.billedAmount,
    description: invoiceData.description || 'Progress payment invoice',
    generatedAt: new Date(),
  };
}

/**
 * Get overdue projects
 */
export async function getOverdueProjects(userId: string): Promise<ProjectStatus[]> {
  const allProjects = await getProjectStatuses(userId);
  const now = new Date();

  return allProjects.filter(project => {
    if (project.status !== 'active') return false;
    if (!project.daysRemaining) return false;
    return project.daysRemaining < 0;
  });
}

/**
 * Calculate cash flow impact
 */
export async function calculateCashFlowImpact(userId: string, months: number = 12): Promise<{
  monthlyBilling: number[];
  monthlyCollections: number[];
  netCashFlow: number[];
}> {
  const projects = await db
    .select()
    .from(progressPayments)
    .where(and(
      eq(progressPayments.userId, userId),
      eq(progressPayments.status, 'active')
    ));

  const monthlyBilling = new Array(months).fill(0);
  const monthlyCollections = new Array(months).fill(0);
  const netCashFlow = new Array(months).fill(0);

  const now = new Date();

  // TODO Tolga'dan teyit al - This is a simplified calculation
  // In production, this would use actual project timelines and payment terms
  projects.forEach(project => {
    const contractValue = parseFloat(project.contractValue);
    const progressPercentage = parseFloat(project.progressPercentage);
    const remainingValue = contractValue * (1 - progressPercentage / 100);
    
    // Estimate monthly billing and collections
    const monthlyBillingAmount = remainingValue / Math.max(months - 1, 1);
    const monthlyCollectionAmount = monthlyBillingAmount * 0.8; // Assume 80% collection rate

    for (let i = 0; i < months; i++) {
      monthlyBilling[i] += monthlyBillingAmount;
      monthlyCollections[i] += monthlyCollectionAmount;
      netCashFlow[i] = monthlyCollections[i] - monthlyBilling[i];
    }
  });

  return {
    monthlyBilling,
    monthlyCollections,
    netCashFlow,
  };
}
