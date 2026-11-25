// Pool PostgreSQL dùng chung. Pool chỉ mở kết nối khi có truy vấn đầu tiên.
// Luôn dùng tham số $1, $2... — KHÔNG ghép chuỗi SQL từ input.
const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  // Neon / Render yêu cầu SSL; Postgres local (Docker) thì không.
  ssl: /localhost|127\.0\.0\.1/.test(config.DATABASE_URL) ? false : { rejectUnauthorized: false },
});

// Tự động kiểm tra và tạo bảng nếu chưa có (phòng khi deploy chưa chạy migration)
async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        movie_slug varchar(255) NOT NULL,
        name text NOT NULL,
        poster text DEFAULT '' NOT NULL,
        added_at timestamptz DEFAULT now() NOT NULL,
        PRIMARY KEY (user_id, movie_slug)
      );
      CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id, added_at DESC);

      CREATE TABLE IF NOT EXISTS watch_history (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        movie_slug varchar(255) NOT NULL,
        name text NOT NULL,
        poster text DEFAULT '' NOT NULL,
        episode varchar(50) NOT NULL,
        progress integer DEFAULT 0 NOT NULL,
        watched_at timestamptz DEFAULT now() NOT NULL,
        PRIMARY KEY (user_id, movie_slug)
      );
      CREATE INDEX IF NOT EXISTS watch_history_user_id_idx ON watch_history(user_id, watched_at DESC);

      CREATE TABLE IF NOT EXISTS comment_likes (
        comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT now() NOT NULL,
        PRIMARY KEY (comment_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);
    `);
  } catch (err) {
    // Không crash server nếu DB chưa kết nối lúc boot
  }
}
ensureTables();

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
