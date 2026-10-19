import 'server-only';
import { getDb } from './mongodb';

export type PlanFeatures = {
  listingAnalytics: boolean;
  buyerInquiries: boolean;
  inspectionUploads: boolean;
  publicBusinessProfile: boolean;
  priorityPlacement: boolean;
};

export const defaultPlanFeatures: PlanFeatures = {
  listingAnalytics: true,
  buyerInquiries: true,
  inspectionUploads: true,
  publicBusinessProfile: true,
  priorityPlacement: false,
};

export async function getVendorSubscription(vendorId: string) {
  const db = await getDb();
  const assignment = await db.collection<Record<string, unknown>>('vendor_subscriptions').findOne({ vendorId, status: 'active' }, { sort: { endAt: -1 } });
  if (!assignment) return null;
  const endAt = new Date(String(assignment.endAt ?? 0));
  if (!Number.isFinite(endAt.getTime()) || endAt.getTime() <= Date.now()) {
    await db.collection('vendor_subscriptions').updateOne({ _id: assignment._id }, { $set: { status: 'expired', updatedAt: new Date() } });
    return { ...assignment, status: 'expired', plan: null };
  }
  const plan = await db.collection<Record<string, unknown>>('subscription_plans').findOne({ id: assignment.planId });
  return { ...assignment, plan: plan ? { id: String(plan.id), name: String(plan.name), price: Number(plan.price), durationDays: Number(plan.durationDays), maxListings: Number(plan.maxListings), maxImagesPerListing: Number(plan.maxImagesPerListing), features: { ...defaultPlanFeatures, ...(plan.features as Partial<PlanFeatures> || {}) } } : null };
}

export async function getVendorEntitlements(vendorId: string) {
  const subscription = await getVendorSubscription(vendorId);
  const plan = subscription?.plan as Record<string, unknown> | null | undefined;
  if (!plan) return { subscription, maxListings: 0, maxImagesPerListing: 0, features: { ...defaultPlanFeatures, buyerInquiries: false, inspectionUploads: false } };
  return { subscription, maxListings: Number(plan.maxListings) || 0, maxImagesPerListing: Math.min(20, Number(plan.maxImagesPerListing) || 0), features: { ...defaultPlanFeatures, ...(plan.features as Partial<PlanFeatures> || {}) } };
}
