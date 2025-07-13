-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 13, 2025 at 03:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `soundsculptors`
--

-- --------------------------------------------------------

--
-- Table structure for table `affiliates`
--

CREATE TABLE `affiliates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('pending','approved','suspended','rejected') DEFAULT 'pending',
  `commission_rate` decimal(5,2) DEFAULT 10.00,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stripe_account_id` varchar(255) DEFAULT NULL,
  `payment_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payment_info`)),
  `application_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `approval_date` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `denial_date` timestamp NULL DEFAULT NULL,
  `denial_reason` text DEFAULT NULL,
  `next_allowed_application_date` timestamp NULL DEFAULT NULL,
  `content_platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`content_platforms`)),
  `audience_info` text DEFAULT NULL,
  `promotion_strategy` text DEFAULT NULL,
  `portfolio_links` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `payout_threshold` decimal(10,2) DEFAULT 50.00,
  `last_payout_date` timestamp NULL DEFAULT NULL,
  `custom_commission_rate` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_payouts`
--

CREATE TABLE `affiliate_payouts` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `commission_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`commission_ids`)),
  `commission_count` int(11) NOT NULL DEFAULT 0,
  `stripe_transfer_id` varchar(255) DEFAULT NULL,
  `stripe_destination_account` varchar(255) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `affiliate_performance`
-- (See below for the actual view)
--
CREATE TABLE `affiliate_performance` (
`id` int(11)
,`user_id` int(11)
,`affiliate_name` varchar(100)
,`affiliate_email` varchar(100)
,`status` enum('pending','approved','suspended','rejected')
,`commission_rate` decimal(5,2)
,`balance` decimal(10,2)
,`total_paid` decimal(10,2)
,`affiliate_code` varchar(50)
,`total_commissions` bigint(21)
,`paid_commissions` bigint(21)
,`total_earnings` decimal(32,2)
,`pending_earnings` decimal(32,2)
,`total_clicks` bigint(21)
,`total_signups` bigint(21)
,`total_conversions` bigint(21)
);

-- --------------------------------------------------------

--
-- Table structure for table `commissions`
--

CREATE TABLE `commissions` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `code_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `rate` decimal(5,2) NOT NULL,
  `order_total` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','paid','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `eligible_for_payout_date` timestamp NOT NULL DEFAULT (current_timestamp() + interval 14 day),
  `approved_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `payout_id` int(11) DEFAULT NULL,
  `paid_date` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `newsletter_signups`
--

CREATE TABLE `newsletter_signups` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `subscribed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `package_type` enum('essential','signature','masterpiece') NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `payment_method` enum('stripe','paypal') DEFAULT NULL,
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `payment_id` varchar(255) DEFAULT NULL,
  `payment_details` text DEFAULT NULL,
  `status` enum('pending','in_production','lyrics_review','song_production','song_review','completed') DEFAULT 'pending',
  `workflow_stage` tinyint(1) DEFAULT 1,
  `song_purpose` varchar(50) DEFAULT NULL,
  `recipient_name` varchar(100) DEFAULT NULL,
  `emotion` varchar(50) DEFAULT NULL,
  `provide_lyrics` tinyint(1) DEFAULT 0,
  `lyrics` text DEFAULT NULL,
  `system_generated_lyrics` text DEFAULT NULL,
  `song_theme` text DEFAULT NULL,
  `personal_story` text DEFAULT NULL,
  `music_style` varchar(50) DEFAULT NULL,
  `show_in_gallery` tinyint(1) DEFAULT 0,
  `lyrics_revisions` int(11) DEFAULT 0,
  `song_revisions` int(11) DEFAULT 0,
  `allow_more_revisions` tinyint(1) DEFAULT 0,
  `lyrics_approved` tinyint(1) DEFAULT 0,
  `additional_notes` text DEFAULT NULL,
  `used_promo_code` varchar(50) DEFAULT NULL,
  `promo_discount_amount` decimal(10,2) DEFAULT 0.00,
  `referring_affiliate_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_email` varchar(100) DEFAULT NULL,
  `customer_address` varchar(255) DEFAULT NULL,
  `customer_city` varchar(100) DEFAULT NULL,
  `customer_postcode` varchar(20) DEFAULT NULL,
  `customer_country` varchar(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `user_id`, `package_type`, `total_price`, `payment_method`, `payment_status`, `payment_id`, `payment_details`, `status`, `workflow_stage`, `song_purpose`, `recipient_name`, `emotion`, `provide_lyrics`, `lyrics`, `system_generated_lyrics`, `song_theme`, `personal_story`, `music_style`, `show_in_gallery`, `lyrics_revisions`, `song_revisions`, `allow_more_revisions`, `lyrics_approved`, `additional_notes`, `used_promo_code`, `promo_discount_amount`, `referring_affiliate_id`, `created_at`, `updated_at`, `customer_name`, `customer_email`, `customer_address`, `customer_city`, `customer_postcode`, `customer_country`) VALUES
(16, 'ORD-867056-878', 9, 'masterpiece', 359.95, NULL, 'pending', NULL, NULL, 'completed', 6, 'wedding', 'Test', 'happy', 0, NULL, 'Test lyrics 6', 'Tes', 'Tested ', 'acoustic-ballad', 1, 5, 2, 0, 1, 'Giehe', NULL, 0.00, NULL, '2025-07-11 18:34:27', '2025-07-11 18:41:14', 'Aaron Wood', 'meaz1234@gmail.com', '9 Churchill Close', 'Heywood', 'Ol102jn', 'GB');

-- --------------------------------------------------------

--
-- Table structure for table `order_addons`
--

CREATE TABLE `order_addons` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `addon_type` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_addons`
--

INSERT INTO `order_addons` (`id`, `order_id`, `addon_type`, `price`) VALUES
(60, 16, 'expedited', 29.99),
(61, 16, 'physical-cd', 34.99),
(62, 16, 'physical-vinyl', 119.99),
(63, 16, 'streaming', 34.99);

-- --------------------------------------------------------

--
-- Table structure for table `order_revisions`
--

CREATE TABLE `order_revisions` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `type` enum('lyrics_approved','lyrics_changes_requested','lyrics_change_request','song_approved','melody_approved','song_change_request','melody_changes_requested','admin_lyrics_note','admin_song_note') NOT NULL,
  `comment` text DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `user_type` enum('customer','admin') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `revision_type` enum('lyrics','song') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_revisions`
--

INSERT INTO `order_revisions` (`id`, `order_id`, `type`, `comment`, `user_id`, `user_type`, `created_at`, `revision_type`) VALUES
(20, 16, 'lyrics_change_request', 'Test', 9, 'customer', '2025-07-11 18:35:23', NULL),
(21, 16, 'lyrics_change_request', 'Test 2', 9, 'customer', '2025-07-11 18:35:49', NULL),
(22, 16, 'lyrics_change_request', 'Test 3', 9, 'customer', '2025-07-11 18:36:06', NULL),
(23, 16, 'lyrics_change_request', 'Test 4', 9, 'customer', '2025-07-11 18:36:41', NULL),
(24, 16, 'admin_lyrics_note', 'Test admin', 9, 'admin', '2025-07-11 18:36:55', 'lyrics'),
(25, 16, 'lyrics_change_request', 'Test 5', 9, 'customer', '2025-07-11 18:37:14', NULL),
(26, 16, 'lyrics_approved', 'Thanks', 9, 'customer', '2025-07-11 18:37:53', NULL),
(27, 16, 'song_change_request', 'Test', 9, 'customer', '2025-07-11 18:38:47', NULL),
(28, 16, 'song_change_request', 'Test change 2', 9, 'customer', '2025-07-11 18:40:14', NULL),
(29, 16, 'admin_song_note', 'Test admin 2', 9, 'admin', '2025-07-11 18:40:33', 'song');

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `promo_codes`
--

CREATE TABLE `promo_codes` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('discount','affiliate') NOT NULL,
  `affiliate_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `is_percentage` tinyint(1) DEFAULT 0,
  `min_order_value` decimal(10,2) DEFAULT 0.00,
  `max_uses` int(11) DEFAULT 0,
  `current_uses` int(11) DEFAULT 0,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `max_uses_per_user` int(11) DEFAULT 1,
  `last_regenerated` timestamp NULL DEFAULT NULL,
  `starts_at` timestamp NULL DEFAULT NULL,
  `conversion_value` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `promo_codes`
--

INSERT INTO `promo_codes` (`id`, `code`, `name`, `type`, `affiliate_id`, `created_by`, `discount_amount`, `is_percentage`, `min_order_value`, `max_uses`, `current_uses`, `expires_at`, `is_active`, `created_at`, `updated_at`, `max_uses_per_user`, `last_regenerated`, `starts_at`, `conversion_value`) VALUES
(1, 'WELCOME10', 'Welcome Discount', 'discount', NULL, 1, 10.00, 1, 0.00, 0, 0, NULL, 1, '2025-07-08 14:16:35', '2025-07-08 14:16:35', 1, NULL, NULL, 0.00),
(2, 'FIRST20', 'First Time Customer', 'discount', NULL, 1, 20.00, 1, 0.00, 0, 0, NULL, 1, '2025-07-08 14:16:35', '2025-07-08 14:16:35', 1, NULL, NULL, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `promo_code_usage`
--

CREATE TABLE `promo_code_usage` (
  `id` int(11) NOT NULL,
  `code_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `discount_applied` decimal(10,2) NOT NULL,
  `used_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referral_events`
--

CREATE TABLE `referral_events` (
  `id` int(11) NOT NULL,
  `code_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `referrer_url` text DEFAULT NULL,
  `event_type` enum('click','signup','purchase') NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `conversion_value` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `showcase_items`
--

CREATE TABLE `showcase_items` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) NOT NULL,
  `audio_path` varchar(255) NOT NULL,
  `author` varchar(100) DEFAULT NULL,
  `genre` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `featured` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_public` tinyint(1) DEFAULT 1,
  `view_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `songs`
--

CREATE TABLE `songs` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `version` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `is_selected` tinyint(1) DEFAULT 0,
  `is_downloaded` tinyint(1) DEFAULT 0,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `songs`
--

INSERT INTO `songs` (`id`, `order_id`, `version`, `title`, `file_path`, `is_selected`, `is_downloaded`, `uploaded_at`) VALUES
(30, 16, 'A', 'Wedding Song (Version A)', 'songs/unknown-versionunknown-1752259184543.mp3', 0, 0, '2025-07-11 18:39:44'),
(31, 16, 'B', 'Wedding Song (Version B)', 'songs/unknown-versionunknown-1752259188502.mp3', 1, 1, '2025-07-11 18:39:48');

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('open','in_progress','awaiting_reply','closed','resolved') DEFAULT 'open',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `category` enum('billing','technical','order','other') DEFAULT 'other',
  `order_id` int(11) DEFAULT NULL,
  `has_new_message` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assigned_to` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `support_tickets`
--

INSERT INTO `support_tickets` (`id`, `user_id`, `subject`, `status`, `priority`, `category`, `order_id`, `has_new_message`, `created_at`, `updated_at`, `assigned_to`) VALUES
(5, 9, 'test', 'awaiting_reply', 'medium', 'other', NULL, 0, '2025-07-11 18:20:45', '2025-07-11 18:20:55', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ticket_messages`
--

CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0,
  `is_auto_response` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ticket_messages`
--

INSERT INTO `ticket_messages` (`id`, `ticket_id`, `user_id`, `message`, `is_admin`, `created_at`, `is_read`, `is_auto_response`) VALUES
(29, 5, 9, 'test', 0, '2025-07-11 18:20:45', 1, 0),
(30, 5, 9, 'test', 0, '2025-07-11 18:20:55', 0, 0);

-- --------------------------------------------------------

--
-- Stand-in structure for view `top_promo_codes`
-- (See below for the actual view)
--
CREATE TABLE `top_promo_codes` (
`id` int(11)
,`code` varchar(50)
,`name` varchar(100)
,`type` enum('discount','affiliate')
,`current_uses` int(11)
,`is_active` tinyint(1)
,`owner_id` int(11)
,`owner_name` varchar(100)
,`total_clicks` bigint(21)
,`conversions` bigint(21)
,`total_revenue` decimal(32,2)
,`conversion_rate` decimal(26,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `affiliate_code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `google_id` varchar(255) DEFAULT NULL,
  `last_active` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `affiliate_code`, `created_at`, `updated_at`, `google_id`, `last_active`) VALUES
(1, 'Admin User', 'admin@songsculptors.com', '$2b$10$X/6jUSP5xsLAYBvB7sSK/.HTxdRlLr0VXbV1y0VLSKPOlMQVw3iYG', 'admin', NULL, '2025-07-08 14:16:32', '2025-07-08 14:16:32', NULL, '2025-07-08 14:16:32'),
(9, 'Aaron Wood', 'meaz1234@gmail.com', 'google-auth-user', 'admin', NULL, '2025-07-11 18:05:37', '2025-07-11 21:48:27', NULL, '2025-07-11 21:48:27'),
(10, 'test', 'test@example.com', '$2b$10$egaju6R44beu7YkQAeHixuAehfppwbX8q7ATMbcK9/eHQ/EfWyGBW', 'user', NULL, '2025-07-11 20:00:06', '2025-07-11 20:00:06', NULL, '2025-07-11 20:00:06');

-- --------------------------------------------------------

--
-- Structure for view `affiliate_performance`
--
DROP TABLE IF EXISTS `affiliate_performance`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `affiliate_performance`  AS SELECT `a`.`id` AS `id`, `a`.`user_id` AS `user_id`, `u`.`name` AS `affiliate_name`, `u`.`email` AS `affiliate_email`, `a`.`status` AS `status`, `a`.`commission_rate` AS `commission_rate`, `a`.`balance` AS `balance`, `a`.`total_paid` AS `total_paid`, `pc`.`code` AS `affiliate_code`, count(distinct `c`.`id`) AS `total_commissions`, count(distinct case when `c`.`status` = 'paid' then `c`.`id` end) AS `paid_commissions`, sum(case when `c`.`status` = 'paid' then `c`.`amount` else 0 end) AS `total_earnings`, sum(case when `c`.`status` = 'pending' then `c`.`amount` else 0 end) AS `pending_earnings`, count(distinct `re`.`id`) AS `total_clicks`, count(distinct case when `re`.`event_type` = 'signup' then `re`.`id` end) AS `total_signups`, count(distinct case when `re`.`event_type` = 'purchase' then `re`.`id` end) AS `total_conversions` FROM ((((`affiliates` `a` join `users` `u` on(`a`.`user_id` = `u`.`id`)) left join `promo_codes` `pc` on(`pc`.`affiliate_id` = `a`.`id` and `pc`.`type` = 'affiliate')) left join `commissions` `c` on(`c`.`affiliate_id` = `a`.`id`)) left join `referral_events` `re` on(`re`.`code_id` = `pc`.`id`)) WHERE `a`.`status` = 'approved' GROUP BY `a`.`id`, `a`.`user_id`, `u`.`name`, `u`.`email`, `a`.`status`, `a`.`commission_rate`, `a`.`balance`, `a`.`total_paid`, `pc`.`code` ;

-- --------------------------------------------------------

--
-- Structure for view `top_promo_codes`
--
DROP TABLE IF EXISTS `top_promo_codes`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `top_promo_codes`  AS SELECT `pc`.`id` AS `id`, `pc`.`code` AS `code`, `pc`.`name` AS `name`, `pc`.`type` AS `type`, `pc`.`current_uses` AS `current_uses`, `pc`.`is_active` AS `is_active`, coalesce(`a`.`user_id`,`pc`.`created_by`) AS `owner_id`, coalesce(`u_aff`.`name`,`u_admin`.`name`) AS `owner_name`, count(distinct `re`.`id`) AS `total_clicks`, count(distinct case when `re`.`event_type` = 'purchase' then `re`.`id` end) AS `conversions`, sum(case when `re`.`event_type` = 'purchase' then `re`.`conversion_value` else 0 end) AS `total_revenue`, CASE WHEN count(distinct `re`.`id`) > 0 THEN round(count(distinct case when `re`.`event_type` = 'purchase' then `re`.`id` end) * 100.0 / count(distinct `re`.`id`),2) ELSE 0 END AS `conversion_rate` FROM ((((`promo_codes` `pc` left join `affiliates` `a` on(`pc`.`affiliate_id` = `a`.`id`)) left join `users` `u_aff` on(`a`.`user_id` = `u_aff`.`id`)) left join `users` `u_admin` on(`pc`.`created_by` = `u_admin`.`id`)) left join `referral_events` `re` on(`re`.`code_id` = `pc`.`id`)) WHERE `pc`.`is_active` = 1 GROUP BY `pc`.`id`, `pc`.`code`, `pc`.`name`, `pc`.`type`, `pc`.`current_uses`, `pc`.`is_active`, coalesce(`a`.`user_id`,`pc`.`created_by`), coalesce(`u_aff`.`name`,`u_admin`.`name`) ORDER BY sum(case when `re`.`event_type` = 'purchase' then `re`.`conversion_value` else 0 end) DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `affiliates`
--
ALTER TABLE `affiliates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_affiliates_status` (`status`),
  ADD KEY `idx_affiliate_user_id` (`user_id`);

--
-- Indexes for table `affiliate_payouts`
--
ALTER TABLE `affiliate_payouts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `affiliate_id` (`affiliate_id`),
  ADD KEY `idx_affiliate_payouts_status` (`status`),
  ADD KEY `idx_affiliate_payouts_created_at` (`created_at`);

--
-- Indexes for table `commissions`
--
ALTER TABLE `commissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_affiliate_order` (`affiliate_id`,`order_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `code_id` (`code_id`),
  ADD KEY `idx_commissions_status` (`status`),
  ADD KEY `idx_commissions_eligible_date` (`eligible_for_payout_date`),
  ADD KEY `payout_id` (`payout_id`);

--
-- Indexes for table `newsletter_signups`
--
ALTER TABLE `newsletter_signups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `idx_orders_user_id` (`user_id`),
  ADD KEY `idx_orders_promo_code` (`used_promo_code`),
  ADD KEY `idx_orders_affiliate` (`referring_affiliate_id`);

--
-- Indexes for table `order_addons`
--
ALTER TABLE `order_addons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `order_revisions`
--
ALTER TABLE `order_revisions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `affiliate_id` (`affiliate_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_promo_codes_type` (`type`),
  ADD KEY `idx_promo_codes_active` (`is_active`),
  ADD KEY `idx_promo_code_affiliate` (`affiliate_id`),
  ADD KEY `idx_promo_code_code` (`code`);

--
-- Indexes for table `promo_code_usage`
--
ALTER TABLE `promo_code_usage`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_code_order` (`user_id`,`code_id`,`order_id`),
  ADD KEY `code_id` (`code_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `referral_events`
--
ALTER TABLE `referral_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `code_id` (`code_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `idx_referral_events_event_type` (`event_type`),
  ADD KEY `idx_referral_events_created_at` (`created_at`);

--
-- Indexes for table `showcase_items`
--
ALTER TABLE `showcase_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `songs`
--
ALTER TABLE `songs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_order_version` (`order_id`,`version`);

--
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `support_tickets_ibfk_3` (`assigned_to`);

--
-- Indexes for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ticket_id` (`ticket_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `affiliate_code` (`affiliate_code`),
  ADD KEY `idx_users_affiliate_code` (`affiliate_code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `affiliates`
--
ALTER TABLE `affiliates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `affiliate_payouts`
--
ALTER TABLE `affiliate_payouts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commissions`
--
ALTER TABLE `commissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `newsletter_signups`
--
ALTER TABLE `newsletter_signups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `order_addons`
--
ALTER TABLE `order_addons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `order_revisions`
--
ALTER TABLE `order_revisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `promo_codes`
--
ALTER TABLE `promo_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `promo_code_usage`
--
ALTER TABLE `promo_code_usage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `referral_events`
--
ALTER TABLE `referral_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `showcase_items`
--
ALTER TABLE `showcase_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `songs`
--
ALTER TABLE `songs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `affiliates`
--
ALTER TABLE `affiliates`
  ADD CONSTRAINT `affiliates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affiliate_payouts`
--
ALTER TABLE `affiliate_payouts`
  ADD CONSTRAINT `affiliate_payouts_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `commissions`
--
ALTER TABLE `commissions`
  ADD CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `commissions_ibfk_3` FOREIGN KEY (`code_id`) REFERENCES `promo_codes` (`id`),
  ADD CONSTRAINT `commissions_ibfk_4` FOREIGN KEY (`payout_id`) REFERENCES `affiliate_payouts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_addons`
--
ALTER TABLE `order_addons`
  ADD CONSTRAINT `order_addons_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_revisions`
--
ALTER TABLE `order_revisions`
  ADD CONSTRAINT `order_revisions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `order_revisions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD CONSTRAINT `promo_codes_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `promo_codes_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `promo_code_usage`
--
ALTER TABLE `promo_code_usage`
  ADD CONSTRAINT `promo_code_usage_ibfk_1` FOREIGN KEY (`code_id`) REFERENCES `promo_codes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `promo_code_usage_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `promo_code_usage_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `referral_events`
--
ALTER TABLE `referral_events`
  ADD CONSTRAINT `referral_events_ibfk_1` FOREIGN KEY (`code_id`) REFERENCES `promo_codes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `referral_events_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `referral_events_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `songs`
--
ALTER TABLE `songs`
  ADD CONSTRAINT `songs_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `support_tickets_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ticket_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
