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

export const defaultStarterPlan = {
  id: 'starter',
  name: 'Standard Vendor Plan',
  price: 0,
  durationDays: 365,
  maxListings: 100,
  maxImagesPerListing: 20,
  features: {
    ...defaultPlanFeatures,
    buyerInquiries: true,
    inspectionUploads: true,
    publicBusinessProfile: true,
  }
};

export async function getVendorSubscription(vendorId: string) {
  const db = await getDb();
  const assignment = await db.collection<Record<string, unknown>>('vendor_subscriptions').findOne({ vendorId, status: 'active' }, { sort: { endAt: -1 } });
  if (!assignment) {
    // Provide standard vendor active subscription so vendor is never blocked
    return {
      id: `default-${vendorId}`,
      vendorId,
      status: 'active',
      planId: 'starter',
      plan: defaultStarterPlan,
      startAt: new Date(),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };
  }
  const endAt = new Date(String(assignment.endAt ?? 0));
  if (!Number.isFinite(endAt.getTime()) || endAt.getTime() <= Date.now()) {
    await db.collection('vendor_subscriptions').updateOne({ _id: assignment._id }, { $set: { status: 'expired', updatedAt: new Date() } });
    return {
      ...assignment,
      status: 'active',
      plan: defaultStarterPlan
    };
  }
  const plan = await db.collection<Record<string, unknown>>('subscription_plans').findOne({ id: assignment.planId });
  return {
    ...assignment,
    plan: plan
      ? {
          id: String(plan.id),
          name: String(plan.name),
          price: Number(plan.price),
          durationDays: Number(plan.durationDays),
          maxListings: Number(plan.maxListings) || 100,
          maxImagesPerListing: Number(plan.maxImagesPerListing) || 20,
          features: { ...defaultPlanFeatures, ...(plan.features as Partial<PlanFeatures> || {}) }
        }
      : defaultStarterPlan
  };
}

export async function getVendorEntitlements(vendorId: string) {
  const subscription = await getVendorSubscription(vendorId);
  const plan = subscription?.plan as Record<string, unknown> | null | undefined;
  if (!plan) {
    return {
      subscription,
      maxListings: 100,
      maxImagesPerListing: 20,
      features: { ...defaultPlanFeatures, buyerInquiries: true, inspectionUploads: true, publicBusinessProfile: true }
    };
  }
  return {
    subscription,
    maxListings: Number(plan.maxListings) || 100,
    maxImagesPerListing: Math.min(20, Number(plan.maxImagesPerListing) || 20),
    features: { ...defaultPlanFeatures, ...(plan.features as Partial<PlanFeatures> || {}) }
  };
}
