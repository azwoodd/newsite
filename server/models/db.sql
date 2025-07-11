-- Database creation (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS soundsculptors;
USE soundsculptors;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  package_type ENUM('essential', 'signature', 'masterpiece') NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'in_production', 'ready_for_review', 'completed') DEFAULT 'pending',
  song_purpose VARCHAR(50),
  recipient_name VARCHAR(100),
  emotion VARCHAR(50),
  provide_lyrics BOOLEAN DEFAULT FALSE,
  lyrics TEXT,
  song_theme TEXT,
  personal_story TEXT,
  music_style VARCHAR(50),
  show_in_gallery BOOLEAN DEFAULT FALSE,
  additional_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order Addons table
CREATE TABLE IF NOT EXISTS order_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  addon_type VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Songs table (versions uploaded by admin)
CREATE TABLE IF NOT EXISTS songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  version VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  is_downloaded BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_order_version (order_id, version)
);

-- Newsletter Signups
CREATE TABLE IF NOT EXISTS newsletter_signups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Showcase Gallery
CREATE TABLE IF NOT EXISTS showcase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_path VARCHAR(255) NOT NULL,
  audio_path VARCHAR(255) NOT NULL,
  author VARCHAR(100),
  genre VARCHAR(100),
  category VARCHAR(50),
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin user if doesn't exist
INSERT INTO users (name, email, password, role)
SELECT 'Admin User', 'admin@songsculptors.com', '$2b$10$X/6jUSP5xsLAYBvB7sSK/.HTxdRlLr0VXbV1y0VLSKPOlMQVw3iYG', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@songsculptors.com');
-- Note: Default password is 'admin123' - change this in production!