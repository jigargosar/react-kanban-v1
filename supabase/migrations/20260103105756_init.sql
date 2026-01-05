-- Boards table
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Columns table
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Cards table
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indices for performance
CREATE INDEX boards_user_id_idx ON boards(user_id);
CREATE INDEX columns_board_id_idx ON columns(board_id);
CREATE INDEX cards_column_id_idx ON cards(column_id);

-- Enable RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- RLS policies: users CRUD own data only
CREATE POLICY "Users CRUD own boards" ON boards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users CRUD own columns" ON columns
  FOR ALL USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users CRUD own cards" ON cards
  FOR ALL USING (
    column_id IN (SELECT id FROM columns WHERE board_id IN
      (SELECT id FROM boards WHERE user_id = auth.uid()))
  );
