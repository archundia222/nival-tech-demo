-- Preserve every existing section while changing the entitlement model from
-- three included sections to one paid credit per section.
update public.payment_profiles
set extra_sections_purchased = greatest(
  coalesce(extra_sections_purchased, 0),
  case
    when jsonb_typeof(custom_sections) = 'array' then jsonb_array_length(custom_sections)
    else 0
  end
);

comment on column public.payment_profiles.extra_sections_purchased is
  'Total section slots unlocked for this profile. Every new slot requires a paid nival_pay_extra_section order.';
