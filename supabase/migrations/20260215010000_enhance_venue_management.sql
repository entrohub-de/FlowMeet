-- Enhance venue management: add address, description, created_by to venues
ALTER TABLE public.evt_venues ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.evt_venues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.evt_venues ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Enhance areas: add description, ordering, type
ALTER TABLE public.evt_areas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.evt_areas ADD COLUMN IF NOT EXISTS area_order INTEGER DEFAULT 0;
ALTER TABLE public.evt_areas ADD COLUMN IF NOT EXISTS area_type VARCHAR(50) DEFAULT 'general';

-- RLS policies for venues
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read venues') THEN
    CREATE POLICY "Allow authenticated read venues" ON public.evt_venues
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert venues') THEN
    CREATE POLICY "Allow authenticated insert venues" ON public.evt_venues
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated update venues') THEN
    CREATE POLICY "Allow authenticated update venues" ON public.evt_venues
      FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated delete venues') THEN
    CREATE POLICY "Allow authenticated delete venues" ON public.evt_venues
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- RLS policies for areas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read areas') THEN
    CREATE POLICY "Allow authenticated read areas" ON public.evt_areas
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert areas') THEN
    CREATE POLICY "Allow authenticated insert areas" ON public.evt_areas
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated update areas') THEN
    CREATE POLICY "Allow authenticated update areas" ON public.evt_areas
      FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated delete areas') THEN
    CREATE POLICY "Allow authenticated delete areas" ON public.evt_areas
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Enable RLS if not enabled
ALTER TABLE public.evt_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evt_areas ENABLE ROW LEVEL SECURITY;
