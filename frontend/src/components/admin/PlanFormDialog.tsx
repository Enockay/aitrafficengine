import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type AdminPlan, useCreatePlan, useUpdatePlan } from '@/hooks/useAdminPlans'
import { getErrorMessage } from '@/lib/errors'

interface PlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: AdminPlan | null
}

const EMPTY_FORM = {
  code: '',
  name: '',
  price_usd: '',
  max_sites: '',
  max_posts_per_month: '',
  max_flyers_per_month: '',
  schedule_horizon_days: '',
  paystack_plan_code: '',
}

export function PlanFormDialog({ open, onOpenChange, plan }: PlanFormDialogProps) {
  const isEditing = !!plan
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()

  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm(
      plan
        ? {
            code: plan.code,
            name: plan.name,
            price_usd: String(plan.price_usd),
            max_sites: String(plan.max_sites),
            max_posts_per_month: String(plan.max_posts_per_month),
            max_flyers_per_month: String(plan.max_flyers_per_month),
            schedule_horizon_days: String(plan.schedule_horizon_days),
            paystack_plan_code: plan.paystack_plan_code,
          }
        : EMPTY_FORM
    )
  }, [open, plan])

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const numericInput = {
      name: form.name,
      price_usd: Number(form.price_usd),
      max_sites: Number(form.max_sites),
      max_posts_per_month: Number(form.max_posts_per_month),
      max_flyers_per_month: Number(form.max_flyers_per_month),
      schedule_horizon_days: Number(form.schedule_horizon_days),
      paystack_plan_code: form.paystack_plan_code.trim(),
    }
    try {
      if (isEditing) {
        await updatePlan.mutateAsync({ code: plan.code, input: numericInput })
        toast.success('Plan updated')
      } else {
        await createPlan.mutateAsync({ code: form.code.trim(), ...numericInput })
        toast.success('Plan created')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save plan'))
    }
  }

  const isSubmitting = createPlan.isPending || updatePlan.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit plan' : 'Add plan'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this plan's limits and pricing."
              : 'The Paystack plan_code must already exist on the configured Paystack account — Paystack never accepts a custom code, it always assigns its own.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="plan-code">Code</Label>
              <Input id="plan-code" required placeholder="starter" {...field('code')} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">Name</Label>
            <Input id="plan-name" required placeholder="Starter" {...field('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Price (USD/mo)</Label>
              <Input id="plan-price" type="number" min={0} required {...field('price_usd')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-sites">Max sites</Label>
              <Input id="plan-sites" type="number" min={0} required {...field('max_sites')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-posts">Max posts/mo</Label>
              <Input id="plan-posts" type="number" min={0} required {...field('max_posts_per_month')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-flyers">Max flyers/mo</Label>
              <Input id="plan-flyers" type="number" min={0} required {...field('max_flyers_per_month')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-horizon">Schedule horizon (days)</Label>
            <Input id="plan-horizon" type="number" min={0} required {...field('schedule_horizon_days')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-paystack-code">Paystack plan_code</Label>
            <Input id="plan-paystack-code" required placeholder="PLN_xxxxxxxxxxxx" {...field('paystack_plan_code')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add plan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
