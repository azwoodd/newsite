-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: soundsculptors
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `newsletter_signups`
--

DROP TABLE IF EXISTS `newsletter_signups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `newsletter_signups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `subscribed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `newsletter_signups`
--

LOCK TABLES `newsletter_signups` WRITE;
/*!40000 ALTER TABLE `newsletter_signups` DISABLE KEYS */;
INSERT INTO `newsletter_signups` VALUES (1,'azwoodd@gmail.com','2025-05-07 11:21:29'),(2,'meaz1234@gmail.com','2025-05-07 11:22:01');
/*!40000 ALTER TABLE `newsletter_signups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_addons`
--

DROP TABLE IF EXISTS `order_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_addons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `addon_type` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_addons_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_addons`
--

LOCK TABLES `order_addons` WRITE;
/*!40000 ALTER TABLE `order_addons` DISABLE KEYS */;
INSERT INTO `order_addons` VALUES (1,1,'expedited',29.99),(2,1,'physical-cd',34.99),(3,1,'physical-vinyl',119.99),(4,1,'streaming',34.99),(5,2,'lyric-sheet',14.99),(6,2,'expedited',29.99),(7,2,'streaming',34.99),(8,3,'lyric-sheet',14.99),(9,3,'physical-cd',34.99),(10,3,'expedited',29.99),(11,3,'streaming',34.99),(12,3,'physical-vinyl',119.99),(13,4,'expedited',29.99),(14,4,'physical-cd',34.99),(15,4,'physical-vinyl',119.99),(16,4,'streaming',34.99),(17,5,'lyric-sheet',14.99),(18,5,'expedited',29.99),(19,5,'physical-cd',34.99),(20,5,'physical-vinyl',119.99),(21,5,'streaming',34.99),(22,6,'expedited',29.99),(23,6,'physical-cd',34.99),(24,6,'physical-vinyl',119.99),(25,6,'streaming',34.99),(26,7,'expedited',29.99),(27,7,'physical-cd',34.99),(28,7,'physical-vinyl',119.99),(29,7,'streaming',34.99),(30,8,'expedited',29.99),(31,8,'physical-cd',34.99),(32,8,'physical-vinyl',119.99),(33,8,'streaming',34.99),(34,9,'expedited',29.99),(35,9,'physical-cd',34.99),(36,9,'physical-vinyl',119.99),(37,9,'streaming',34.99),(38,10,'expedited',29.99),(39,10,'physical-cd',34.99),(40,10,'physical-vinyl',119.99),(41,10,'streaming',34.99),(42,11,'expedited',29.99),(43,11,'physical-cd',34.99),(44,11,'physical-vinyl',119.99),(45,11,'streaming',34.99),(46,12,'expedited',29.99),(47,12,'physical-cd',34.99),(48,12,'physical-vinyl',119.99),(49,12,'streaming',34.99),(50,13,'expedited',29.99),(51,13,'physical-cd',34.99),(52,13,'physical-vinyl',119.99),(53,13,'streaming',34.99),(54,14,'expedited',29.99),(55,14,'physical-cd',34.99),(56,14,'physical-vinyl',119.99),(57,14,'streaming',34.99);
/*!40000 ALTER TABLE `order_addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_revisions`
--

DROP TABLE IF EXISTS `order_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_revisions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `type` enum('lyrics_approved','lyrics_changes_requested','lyrics_change_request','song_approved','melody_approved','song_change_request','melody_changes_requested','admin_lyrics_note','admin_song_note') NOT NULL,
  `comment` text DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `user_type` enum('customer','admin') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `revision_type` enum('lyrics','song') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `order_revisions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `order_revisions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_revisions`
--

LOCK TABLES `order_revisions` WRITE;
/*!40000 ALTER TABLE `order_revisions` DISABLE KEYS */;
INSERT INTO `order_revisions` VALUES (1,9,'','Change them ',7,'customer','2025-05-11 20:16:15',NULL),(2,10,'','Test lyric updates form here ',7,'customer','2025-05-12 00:19:01',NULL),(3,11,'','i like them',2,'customer','2025-05-12 00:22:51',NULL),(4,12,'','nice make some changes though',2,'customer','2025-05-12 11:01:19',NULL),(5,12,'','okay changing up some things',2,'admin','2025-05-12 11:09:17',NULL),(6,12,'','nice one more edit thought please',2,'customer','2025-05-12 11:09:59',NULL),(7,12,'lyrics_approved','test',2,'customer','2025-05-12 11:10:27','lyrics'),(8,12,'','testing testing',2,'customer','2025-05-12 11:12:26',NULL),(9,13,'lyrics_change_request','lets make changes',2,'customer','2025-05-12 15:06:11',NULL),(10,13,'admin_lyrics_note','okay making changes by dddooindlk',2,'admin','2025-05-12 15:06:38','lyrics'),(11,13,'song_change_request','not these',2,'customer','2025-05-12 15:07:58',NULL),(12,14,'lyrics_change_request','dadasda',2,'customer','2025-05-12 15:12:30',NULL),(13,14,'admin_lyrics_note','asdas',2,'admin','2025-05-12 15:12:48','lyrics'),(14,14,'lyrics_change_request','asdasdas',2,'customer','2025-05-12 15:12:58',NULL),(15,14,'lyrics_approved','sadsa',2,'customer','2025-05-12 15:13:31',NULL),(16,14,'song_change_request','adsadsa',2,'customer','2025-05-12 15:14:13',NULL);
/*!40000 ALTER TABLE `order_revisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_email` varchar(100) DEFAULT NULL,
  `customer_address` varchar(255) DEFAULT NULL,
  `customer_city` varchar(100) DEFAULT NULL,
  `customer_postcode` varchar(20) DEFAULT NULL,
  `customer_country` varchar(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'ORD-420332-857',2,'masterpiece',323.95,NULL,'pending',NULL,NULL,'lyrics_review',1,'anniversary','test','nostalgic',0,NULL,'test lyircs hello','test','test','dance-electronic',1,3,3,0,0,'test','2025-05-10 15:53:40','2025-05-11 11:35:56','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(2,'ORD-516696-991',2,'essential',119.96,NULL,'pending',NULL,NULL,'in_production',2,'proposal','Aaron','happy',0,NULL,'Test lyrics 1','Hello this is my test theme please take the theme I’m giving you into account when you build my song','It’s a bunch of key events and stories that I should provide here in just writing text to test this order','modern-pop',1,2,0,0,0,'Test additional notes here for me to review within the admin dashboard later ','2025-05-10 16:45:16','2025-05-11 11:27:55','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','FY7 8JQ','GB'),(3,'ORD-205090-292',2,'signature',309.94,NULL,'pending',NULL,NULL,'completed',6,'anniversary','sadas','romantic',0,NULL,'test','test','test','modern-pop',1,1,2,0,0,'test','2025-05-10 17:46:45','2025-05-11 11:27:55','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(4,'ORD-703160-845',6,'masterpiece',359.95,NULL,'pending',NULL,NULL,'completed',6,'birthday','Aaron','happy',0,NULL,'Hello thanks for ordering please review the lyrics below and ensure your happy with everything feel free to leave us some notes and well be happy to give it a shuffle and get it right back to you!\n\n[Verse 1]\nNot all heroes stand on stages,\nSome build futures turning pages.\nWith gentle hands and steady voice,\nYou helped us stumble toward our choice.\n\n[Verse 2]\nWe spoke in formulas and dreams,\nIn lab notes and in quiet themes.\nYou never asked for the applause,\nBut we all knew your greater cause.\n\n[Chorus]\nYou\'re the quiet kind of brilliant,\nA mind that opened doors.\nA melody of mentorship\nThat plays forevermore.\nAnd every student walking out,\nCarries you in what they’re about.\n\n[Verse 3]\nWe watched you play that saxophone,\nBreathing life into the tone.\nThat same breath built us too,\nIn ways we’re only now seeing through.\n\n[Bridge – Sax solo reflecting the melody of the chorus]\n\n[Final Chorus]\nYou\'re the quiet kind of brilliant,\nWith a legacy so vast.\nYour song will play in all of us—\nA future built from the past.\nNow your curtain gently falls,\nBut your music fills the halls.','Test','Test','pop-ballad',1,1,4,0,0,'Test','2025-05-10 19:01:43','2025-05-11 11:27:55','Aaron Wood','bbbb@gmail.com','9 Churchill Close','Heywood','Ol102jn','GB'),(5,'ORD-452041-727',2,'signature',309.94,NULL,'pending',NULL,NULL,'lyrics_review',1,'anniversary','new','nostalgic',0,NULL,'[Verse 1]\nYou never needed center stage\nTo make the whole room shine.\nYou gave your time like open hands\nAnd love without a sign.\n\nYou built a world from little things—\nA quiet smile, a steady word.\nThe kind of life that softly speaks\nBut still is deeply heard.\n\n[Chorus]\nThe way you walked the world was slow and kind,\nYou carried hearts, not just your own in time.\nAnd though your steps have wandered past our view,\nWe walk a better road because of you.\n\n[Verse 2]\nYou taught us grace in simple ways,\nIn how you brewed the tea,\nHow you remembered every name\nAnd left space just to be.\n\nThe garden grew beneath your care,\nThe stories bloomed each year.\nEven in the silence now,\nYour laughter feels so near.\n\n[Chorus]\nThe way you walked the world was slow and kind,\nYou carried hearts, not just your own in time.\nAnd though your steps have wandered past our view,\nWe walk a better road because of you.\n\n[Bridge]\nSo we’ll light the fire, we’ll pass the song,\nWe’ll try to live with hearts so strong.\nAnd when we miss you, we’ll just smile—\nYou taught us how to stay awhile.\n\n[Final Chorus]\nThe way you walked the world still lights our way,\nIn every word we didn’t get to say.\nAnd though this chapter ends too soon,\nThe world remembers how you moved.','new','new','traditional-folk',1,1,0,0,0,'new','2025-05-11 11:37:32','2025-05-11 11:38:18','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(6,'ORD-124650-566',6,'masterpiece',359.95,NULL,'pending',NULL,NULL,'lyrics_review',3,'wedding','sadas','nostalgic',1,'test','testing testing',NULL,NULL,'chill-electronic',1,1,0,0,1,'test','2025-05-11 17:05:24','2025-05-11 17:37:31','Aaron Wood','bbbb@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(7,'ORD-215348-226',7,'masterpiece',359.95,NULL,'pending',NULL,NULL,'song_review',5,'wedding','Test song','happy',0,NULL,'Test lyrics ','Test song','Test song ','upbeat-pop',1,1,0,0,1,'Test name','2025-05-11 18:46:55','2025-05-11 18:52:06','Test Account','Test@gmail.com','6 Bristol Avenue','Fleetwood','FY7 8JQ','GB'),(8,'ORD-057539-497',6,'masterpiece',359.95,NULL,'pending',NULL,NULL,'completed',6,'proposal','testtest','happy',0,NULL,'testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest','testt','testt','indie-electronic',1,1,2,0,1,'testtest','2025-05-11 19:00:57','2025-05-11 19:09:40','Aaron Wood','bbbb@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(9,'ORD-686545-117',7,'masterpiece',359.95,NULL,'pending',NULL,NULL,'in_production',2,'proposal','Song','happy',0,NULL,'hkjgyhgtuiyyhui8yhgtuy yjgyhjgf jhgfg jhf yjghf vg fgjh fgf \n y\np y y\n y\ny \ny \ny\ny y\n y\ny y\ny y\n y y \n yy y y  yy \ny \ny y \ny \ny \ny \ny \n','So my','Song','modern-rnb',1,2,0,0,0,'Song','2025-05-11 19:28:06','2025-05-11 20:16:15','Test Account','Test@gmail.com','6 Bristol Avenue','Fleetwood','FY7 8JQ','GB'),(10,'ORD-027119-717',7,'masterpiece',359.95,NULL,'pending',NULL,NULL,'in_production',2,'proposal','Test','nostalgic',0,NULL,'lyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics herelyrics here','Test','Test','modern-pop',1,2,0,0,0,'Test','2025-05-12 00:17:07','2025-05-12 00:19:01','Test Account','Test@gmail.com','6 Bristol Avenue','Fleetwood','FY7 8JQ','GB'),(11,'ORD-301637-810',2,'masterpiece',359.95,NULL,'pending',NULL,NULL,'completed',6,'anniversary','test','peaceful',0,NULL,'testestsfdsfsdfsdf','tesat','test','dance-electronic',1,2,0,0,1,'test','2025-05-12 00:21:41','2025-05-12 10:56:50','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(12,'ORD-645642-120',2,'masterpiece',359.95,NULL,'pending',NULL,NULL,'song_production',4,'anniversary','test','nostalgic',0,NULL,'lyric given here corrected again','test','test','modern-pop',1,5,1,0,1,'test','2025-05-12 11:00:45','2025-05-12 11:18:19','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(13,'ORD-324934-877',2,'masterpiece',359.95,NULL,'pending',NULL,NULL,'song_production',4,'anniversary','sadas','nostalgic',0,NULL,'changed up lyrics first try','zxcs','sdfs','chill-electronic',1,3,1,0,1,'fssf','2025-05-12 15:05:24','2025-05-12 15:07:58','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB'),(14,'ORD-726241-195',2,'masterpiece',359.95,NULL,'pending',NULL,NULL,'song_production',4,'proposal','testst','nostalgic',0,NULL,'adsadsaasdasda fadfasdas','tew','teww','indie-electronic',1,5,1,0,1,'efsdfsd','2025-05-12 15:12:06','2025-05-12 15:14:13','Aaron Wood','meaz1234@gmail.com','6 Bristol Avenue','Fleetwood','fy7 8jq','GB');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `showcase_items`
--

DROP TABLE IF EXISTS `showcase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `showcase_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `view_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `showcase_items`
--

LOCK TABLES `showcase_items` WRITE;
/*!40000 ALTER TABLE `showcase_items` DISABLE KEYS */;
INSERT INTO `showcase_items` VALUES (3,'Ten Years and a Latte','\"Ten Years and a Latte\" is a romantic acoustic ballad celebrating a decade of love, travel, and shared dreams that began with a spilled coffee. Featuring gentle guitar and subtle piano, it’s a heartfelt tribute to a beautiful life built together.','showcase/images/ten-years-and-a-latte-1746665136192.jpeg','showcase/audio/ten-years-and-a-latte-1746665136193.mp3','Sarah','Acoustic Ballad','celebration',1,'2025-05-08 00:45:36',1,0),(4,'Lessons by the Water','\"Lessons by the Water\" is a nostalgic folk tribute to a father’s wisdom, capturing the quiet strength of a dad who taught life’s most meaningful lessons—on the road, in the garage, and by the water. With heartfelt lyrics and a warm traditional melody, it’s a perfect 60th birthday gift for a lifelong hero.','showcase/images/lessons-by-the-water-1746666053972.jpeg','showcase/audio/lessons-by-the-water-1746666053973.mp3','Robert (Dad)','Folk, Traditional Folk','celebration',1,'2025-05-08 01:00:53',1,0),(5,'Barcelona Begins','\"Barcelona Begins\" is a romantic pop ballad with a warm Spanish guitar flair, crafted for a once-in-a-lifetime proposal moment. Inspired by shared dreams, sacrifice, and enduring love, it’s a heartfelt promise set under the stars of a beloved city.','showcase/images/barcelona-begins-1746667007547.jpeg','showcase/audio/barcelona-begins-1746667007548.mp3','Miguel','Pop, Pop Ballad','wedding',1,'2025-05-08 01:16:47',1,0),(6,'Our Sunrise','\"Our Sunrise\" is an uplifting indie pop ballad that celebrates Emma and Jack’s journey from neighbors to soulmates. With heartfelt lyrics and an infectious melody, it’s a perfect wedding song to capture their shared love for adventure, hiking, and watching the sunrise together.','showcase/images/our-sunrise-1746667775543.jpeg','showcase/audio/our-sunrise-1746667775544.mp3','Emma & Jack','Indie, Indie Pop','wedding',1,'2025-05-08 01:29:35',1,0),(7,'Against the Odds','\"Against the Odds\" is an energetic rock/pop-punk anthem celebrating Tyler’s incredible journey from overcoming challenges to achieving graduation with honors. This powerful song captures his strength, perseverance, and the bright future ahead.','showcase/images/against-the-odds-1746668177787.jpeg','showcase/audio/against-the-odds-1746668177787.mp3','Tyler (Nephew)','Rock, Pop Punk','celebration',1,'2025-05-08 01:36:17',1,0),(8,'Through the Storm','\"Through the Storm\" is a chill electronic track that builds slowly, mirroring the strength and enduring nature of a long-lasting love. This peaceful anthem celebrates the quiet power of a partnership that’s weathered every challenge together.','showcase/images/through-the-storm-1746668612848.jpeg','showcase/audio/through-the-storm-1746668612848.mp3','David','Electronic, Chill Electronic','celebration',1,'2025-05-08 01:43:32',1,0),(9,'Her Love, Our Strength','\"Her Love, Our Strength\" is a soulful R&B ballad honoring a mother’s sacrifice, love, and resilience. This song beautifully expresses the deep gratitude for the strength she passed on, shaping a family’s foundation and inspiring their future.','showcase/images/her-love--our-strength-1746669045856.jpeg','showcase/audio/her-love--our-strength-1746669045857.mp3','Linda','R&B, Soul R&B','celebration',1,'2025-05-08 01:50:45',1,0),(10,'Our Summit','\"Our Summit\" is an Indie Folk proposal song that celebrates the shared adventure of love. From mountain peaks to life’s journey, this heartfelt song reflects a love built on trust, excitement, and the promise of forever.','showcase/images/our-summit-1746670406382.jpeg','showcase/audio/our-summit-1746670406383.mp3','Jen','Folk, Indie Folk','celebration',1,'2025-05-08 02:13:26',1,0),(11,'Books and Burnt Pasta','\"Books and Burnt Pasta\" is a playful and heartfelt pop wedding song made for couples who found love in life’s imperfect moments. Perfect for a dance floor celebration, it honors the quirks, laughter, and quiet strength that make lasting love.','showcase/images/books-and-burnt-pasta-1746709428161.jpeg','showcase/audio/books-and-burnt-pasta-1746709428162.mp3','Olivia & Sarah','Pop, Upbeat Pop','wedding',1,'2025-05-08 13:03:48',1,0),(12,'Sophia, You’re Here','\"Sophia, You\'re Here\" is a tender acoustic lullaby celebrating the long-awaited arrival of a miracle baby. Filled with love, longing, and joy, this peaceful song is perfect for bedtime or a quiet moment between parent and child.','showcase/images/sophia--you---re-here-1746710059361.jpeg','showcase/audio/sophia--you---re-here-1746710059361.mp3','Sophia','Acoustic, Acoustic Folk','family',1,'2025-05-08 13:14:19',1,0),(13,'Two Worlds, One Heart','“Two Worlds, One Heart” is a joyful celebration of blended cultures, honoring love that crosses continents and traditions. With subtle Indian musical influences and a modern pop sound, it captures the magic of building a shared life rooted in love.\r\n\r\n','showcase/images/two-worlds--one-heart-1746710573205.jpeg','showcase/audio/two-worlds--one-heart-1746710573206.mp3','Priya','Pop, Modern Pop','celebration',1,'2025-05-08 13:22:53',1,0),(14,'Fort Builders & Fender Dreams','“Fort Builders & Fender Dreams” is a nostalgic, high-energy birthday anthem celebrating the lifelong bond of brotherhood. Packed with 90s rock references and childhood memories, it\'s the perfect tribute to a brother who\'s been there through it all.','showcase/images/fort-builders---fender-dreams-1746712450855.jpeg','showcase/audio/fort-builders---fender-dreams-1746712450855.mp3','James','Rock, Rock & Roll','celebration',1,'2025-05-08 13:54:10',1,0),(15,'Step by Step','“Step by Step” is a bold and soulful proposal anthem for a love forged through resilience and recovery. With a rhythmic heartbeat and heartfelt message, it’s a powerful tribute to a couple who healed together and now face life side by side.','showcase/images/step-by-step-1746738159482.jpeg','showcase/audio/step-by-step-1746738159483.mp3','Thomas','R&B, Modern R&B','wedding',1,'2025-05-08 21:02:39',1,0),(16,'Fluent in You','“Fluent in You” is a bilingual wedding folk song that celebrates a romance born from translation, gestures, and hearts learning each other’s rhythms. With soft harmonies in English and Spanish, it’s a moving tribute to the beautiful language of love.\r\n\r\n','showcase/images/fluent-in-you-1746738749787.jpeg','showcase/audio/fluent-in-you-1746738749787.mp3','Carlos & Maria','Folk, Modern Folk','wedding',1,'2025-05-08 21:12:29',1,0),(17,'The Quiet Kind Of Brilliant','“The Quiet Kind of Brilliant” is a nostalgic smooth jazz piece honoring a remarkable mentor’s retirement. Centered around warm saxophone melodies, it celebrates the quiet power of leadership, knowledge, and enduring influence.','showcase/images/the-quiet-kind-of-brilliant-1746964871654.jpeg','showcase/audio/the-quiet-kind-of-brilliant-1746964871655.mp3','Matthew','Jazz, Smooth Jazz','memorial',1,'2025-05-11 12:01:11',1,0),(18,'Songsculptors Jingle','Discover real songs crafted from real stories. Every track is a one-of-a-kind gift, sculpted with heart and harmony. Listen, feel, and get inspired—your story could be next!','showcase/images/logo--2--1746965163252.png','showcase/audio/songsculptor-jingle-1746965163264.mp3','Songsculptors','Acoustic, Indie Acoustic','corporate',1,'2025-05-11 12:06:03',1,0),(19,'The Way You Walked the World','“The Way You Walked the World” is a heartfelt acoustic ballad crafted for celebrating a life well lived. With tender lyrics and gentle folk instrumentation, it offers a timeless tribute to someone whose quiet strength and love left a lasting imprint on every heart they touched.','showcase/images/the-way-you-walked-the-world-1746965383686.jpeg','showcase/audio/the-way-you-walked-the-world-1746965383686.mp3','Margaret','Acoustic, Acoustic Ballad','memorial',1,'2025-05-11 12:09:43',1,0),(20,'Fifty Years, One Beat','This upbeat, heartfelt electronic pop song celebrates five decades of friendship with catchy rhythms and synth-driven warmth. With Rachel’s name lovingly included, it’s a joyful birthday gift filled with personal moments, inside jokes, and the kind of bond that only grows stronger with time.','showcase/images/fifty-years--one-beat-1746966119205.jpeg','showcase/audio/fifty-years--one-beat-1746966119206.mp3','Rachel','Electronic, Electronic Pop','celebration',1,'2025-05-11 12:21:59',1,0);
/*!40000 ALTER TABLE `showcase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `songs`
--

DROP TABLE IF EXISTS `songs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `songs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `version` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `is_selected` tinyint(1) DEFAULT 0,
  `is_downloaded` tinyint(1) DEFAULT 0,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_version` (`order_id`,`version`),
  CONSTRAINT `songs_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `songs`
--

LOCK TABLES `songs` WRITE;
/*!40000 ALTER TABLE `songs` DISABLE KEYS */;
INSERT INTO `songs` VALUES (9,1,'A','version A','songs/unknown-versionunknown-1746895132497.mp3',1,1,'2025-05-10 16:38:52'),(10,1,'B','Version B','songs/unknown-versionunknown-1746895139274.mp3',0,0,'2025-05-10 16:38:59'),(11,3,'A','Anniversary Song (Version A)','songs/unknown-versionunknown-1746899284843.mp3',1,1,'2025-05-10 17:48:04'),(12,3,'B','Anniversary Song (Version B)','songs/unknown-versionunknown-1746899290055.mp3',0,0,'2025-05-10 17:48:10'),(15,4,'A','Birthday Song (Version A)','songs/unknown-versionunknown-1746903865739.mp3',1,0,'2025-05-10 19:04:25'),(16,4,'B','Birthday Song (Version B)','songs/unknown-versionunknown-1746903870718.mp3',0,0,'2025-05-10 19:04:30'),(17,8,'A','Proposal Song (Version A)','songs/unknown-versionunknown-1746990395557.mp3',1,1,'2025-05-11 19:06:35'),(18,8,'B','Proposal Song (Version B)','songs/unknown-versionunknown-1746990404242.mp3',0,0,'2025-05-11 19:06:44'),(19,12,'A','Anniversary Song (Version A)','songs/unknown-versionunknown-1747048318324.mp3',0,0,'2025-05-12 11:11:58'),(20,12,'B','Anniversary Song (Version B)','songs/unknown-versionunknown-1747048322995.mp3',0,0,'2025-05-12 11:12:03'),(21,13,'A','Anniversary Song (Version A)','songs/unknown-versionunknown-1747062456260.mp3',0,0,'2025-05-12 15:07:36'),(22,13,'B','Anniversary Song (Version B)','songs/unknown-versionunknown-1747062461316.mp3',0,0,'2025-05-12 15:07:41'),(23,14,'A','Proposal Song (Version A)','songs/unknown-versionunknown-1747062834497.mp3',0,0,'2025-05-12 15:13:54'),(24,14,'B','Proposal Song (Version B)','songs/unknown-versionunknown-1747062837591.mp3',0,0,'2025-05-12 15:13:57');
/*!40000 ALTER TABLE `songs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('open','in_progress','awaiting_reply','closed','resolved') DEFAULT 'open',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `category` enum('billing','technical','order','other') DEFAULT 'other',
  `order_id` int(11) DEFAULT NULL,
  `has_new_message` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assigned_to` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `order_id` (`order_id`),
  KEY `support_tickets_ibfk_3` (`assigned_to`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
INSERT INTO `support_tickets` VALUES (1,2,'sdasda','closed','low','order',NULL,0,'2025-05-08 22:44:59','2025-05-09 14:16:41',NULL),(2,2,'test ticket','closed','medium','technical',NULL,0,'2025-05-09 13:22:18','2025-05-09 20:05:27',NULL),(3,6,'hekp','closed','high','order',NULL,0,'2025-05-09 13:23:19','2025-05-09 14:16:59',2);
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_messages`
--

DROP TABLE IF EXISTS `ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0,
  `is_auto_response` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_messages`
--

LOCK TABLES `ticket_messages` WRITE;
/*!40000 ALTER TABLE `ticket_messages` DISABLE KEYS */;
INSERT INTO `ticket_messages` VALUES (1,1,2,'asdas',0,'2025-05-08 22:44:59',1,0),(2,1,2,'Hi there! How can I help you today?',1,'2025-05-08 23:52:17',1,0),(3,1,2,'is this live',1,'2025-05-08 23:52:34',1,0),(4,1,2,'test',1,'2025-05-08 23:57:14',1,0),(5,1,2,'test',1,'2025-05-08 23:57:18',1,0),(6,1,2,'hi',1,'2025-05-08 23:57:55',1,0),(7,1,2,'hi',1,'2025-05-08 23:58:00',1,0),(8,1,2,'bob',1,'2025-05-08 23:58:06',1,0),(9,1,2,'dylan',1,'2025-05-08 23:58:10',1,0),(10,2,2,'help my nose fell off',0,'2025-05-09 13:22:18',1,0),(11,2,2,'really?',1,'2025-05-09 13:22:32',1,0),(12,3,6,'help me',0,'2025-05-09 13:23:19',1,0),(13,3,2,'how can i assit you?',1,'2025-05-09 13:23:31',1,0),(14,3,6,'can you help me?',0,'2025-05-09 13:25:09',1,0),(15,3,2,'sure',1,'2025-05-09 14:15:23',1,0),(16,3,6,'how',0,'2025-05-09 14:15:34',1,0),(17,3,2,'easily',1,'2025-05-09 14:15:37',1,0),(18,3,2,'dont worry im here to help',1,'2025-05-09 14:15:44',1,0),(19,3,6,'thanks',0,'2025-05-09 14:15:47',1,0),(20,3,6,'hello?',0,'2025-05-09 14:16:47',1,0);
/*!40000 ALTER TABLE `ticket_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `google_id` varchar(255) DEFAULT NULL,
  `last_active` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@songsculptors.com','$2b$10$X/6jUSP5xsLAYBvB7sSK/.HTxdRlLr0VXbV1y0VLSKPOlMQVw3iYG','admin','2025-05-04 22:33:06','2025-05-04 22:33:06',NULL,'2025-05-07 14:21:57'),(2,'Aaron Wood','meaz1234@gmail.com','google-auth-user','admin','2025-05-06 19:45:06','2025-05-11 12:54:28','117252075423853778111','2025-05-11 12:54:28'),(3,'Aaron Wood','azwoodd@gmail.com','google-auth-user','user','2025-05-06 19:55:45','2025-05-06 19:55:45','102169938440506405454','2025-05-07 14:21:57'),(4,'Aaron Wood','banna@gmail.com','$2b$10$o26jMSqu27SNB8pqcQPaWu7qCBGGgCFd.LnwHs/6g07RNRrOJ8Tla','user','2025-05-06 19:58:10','2025-05-06 19:58:10',NULL,'2025-05-07 14:21:57'),(5,'Aaron','aarontesttttttyttttttsjwhw@gmail.com','$2b$10$Kbq4F2MBXIagekt/jrs5ouUq4uoBqriwdoHS8TqWrulZ/7MgWX3UK','user','2025-05-06 22:55:56','2025-05-06 22:55:56',NULL,'2025-05-07 14:21:57'),(6,'Aaron Wood','bbbb@gmail.com','$2b$10$rSIw5yUjoCF7hyZLNaqmYuAlj9z0.fxF1gpEK52SN5iDcO7EPGo7u','user','2025-05-09 12:59:47','2025-05-09 12:59:47',NULL,'2025-05-09 12:59:47'),(7,'Test Account','Test@gmail.com','$2b$10$Xhko8wfXFdv0DE3w8D/f5.WItgYaOYgzPdvYDufmR116rIkrNMe0O','user','2025-05-11 18:45:11','2025-05-11 18:45:11',NULL,'2025-05-11 18:45:11');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-12  8:25:36
