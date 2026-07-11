
USE SFITS_DBMS_PRJ;

-- 1. USERS
INSERT IGNORE INTO USERS (user_id, username, email, password, role) VALUES 
(1, 'Aarav Sharma', 'aarav@paynest.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'founder'),
(2, 'Kunal Verma', 'kunal@vestly.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'founder'),
(3, 'Rohan Malhotra', 'rohan@northstar.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'investor'),
(4, 'Ananya Kapoor', 'ananya@bluewave.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'investor'),
(5, 'Sneha Rao', 'sneha@northloop.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'founder'),
(6, 'Pooja Iyer', 'pooja@ledgerly.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'founder'),
(7, 'Vikram Chawla', 'vikram@quickcart.in', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'founder'),
(8, 'Priya Nair', 'priya@solo.com', '$2b$10$.kNhne7lj.nz1975BnrzBO/Ml3Whezy7U7FFQRB2LnXvgZ.gjjePC', 'investor');

-- 2. INDUSTRIES
INSERT IGNORE INTO INDUSTRY VALUES 
(1, 'FinTech'), (2, 'HealthTech'), (3, 'EdTech'), (4, 'E-Commerce'), 
(5, 'FoodTech'), (6, 'Logistics'), (7, 'AgriTech'), (8, 'Mobility'), 
(9, 'Beauty & Fashion'), (10, 'SaaS'), (11, 'Gaming'), (12, 'Social Media');

-- 3. STARTUPS
INSERT IGNORE INTO STARTUP (startup_id, startup_name, founded_year, stage, city, state, country, industry_id) VALUES
(1, 'PayNest', 2019, 'Series B', 'Mumbai', 'Maharashtra', 'India', 1),
(2, 'Vestly', 2018, 'Series A', 'Bangalore', 'Karnataka', 'India', 1),
(3, 'Northloop Health', 2020, 'Seed', 'Pune', 'Maharashtra', 'India', 2),
(4, 'CropSense', 2021, 'Pre-Seed', 'Indore', 'Madhya Pradesh', 'India', 7),
(5, 'Ledgerly', 2017, 'Series C', 'Bangalore', 'Karnataka', 'India', 10),
(6, 'Skillbridge', 2020, 'Seed', 'Delhi', 'Delhi', 'India', 3),
(7, 'Quickcart Logistics', 2019, 'Series A', 'Chennai', 'Tamil Nadu', 'India', 6),
(8, 'Homestead Robotics', 2021, 'Pre-Seed', 'Hyderabad', 'Telangana', 'India', 8);

-- 4. FOUNDERS
INSERT IGNORE INTO FOUNDER (founder_id, founder_name, founder_email, founder_role, initial_equity, startup_id, user_id) VALUES
(1, 'Aarav Sharma', 'aarav@paynest.com', 'CEO', 30, 1, 1),
(2, 'Neha Gupta', 'neha@paynest.com', 'CTO', 25, 1, NULL),
(3, 'Kunal Verma', 'kunal@vestly.com', 'CEO', 45, 2, 2),
(4, 'Sneha Rao', 'sneha@northloop.com', 'CEO', 80, 3, 5),
(5, 'Ravi Teja', 'ravi@cropsense.in', 'Founder', 90, 4, NULL),
(6, 'Pooja Iyer', 'pooja@ledgerly.com', 'CEO', 20, 5, 6),
(7, 'Aditya Singh', 'aditya@ledgerly.com', 'CTO', 18, 5, NULL),
(8, 'Kiran Desai', 'kiran@skillbridge.in', 'CEO', 75, 6, NULL),
(9, 'Vikram Chawla', 'vikram@quickcart.in', 'CEO', 40, 7, NULL),
(10, 'Siddharth Bose', 'siddharth@homestead.ai', 'Founder', 85, 8, NULL);

-- 5. INVESTORS
INSERT IGNORE INTO INVESTOR (investor_id, investor_name, firm_name, investor_type, country, user_id) VALUES
(1, 'Rohan Malhotra', 'Northstar Ventures', 'VC', 'India', 3),
(2, 'Ananya Kapoor', 'Bluewave Partners', 'VC', 'India', 4),
(3, 'Priya Nair', 'Solo Angel', 'Angel', 'India', 8),
(4, 'Arjun Mehta', 'Nimbus Capital', 'VC', 'India', NULL),
(5, 'Devika Rao', 'Horizon Growth Partners', 'Private Equity', 'India', NULL),
(6, 'Karan Oberoi', 'Solo Angel', 'Angel', 'India', NULL);

-- 6. INVESTOR FOCUS INDUSTRIES
INSERT IGNORE INTO INVESTOR_FOCUS_INDUSTRY VALUES
(1, 1), (1, 10), (2, 2), (2, 1), (3, 3), (3, 4), 
(4, 1), (4, 6), (5, 10), (5, 2), (6, 7), (6, 8);

-- 7. FUNDING ROUNDS
INSERT IGNORE INTO FUNDING_ROUND (round_id, startup_id, round_type, round_date, target_funding, amount_raised, valuation) VALUES
(1, 1, 'Seed', '2019-11-10', 50000000, 50000000, 250000000),
(2, 1, 'Series A', '2021-04-15', 200000000, 200000000, 1200000000),
(3, 1, 'Series B', '2023-09-01', 800000000, 400000000, 4000000000),
(4, 2, 'Seed', '2019-02-20', 30000000, 30000000, 150000000),
(5, 2, 'Series A', '2022-08-11', 300000000, 300000000, 1500000000),
(6, 3, 'Seed', '2021-05-14', 80000000, 80000000, 300000000),
(7, 4, 'Pre-Seed', '2022-10-05', 20000000, 20000000, 80000000),
(8, 5, 'Seed', '2018-01-10', 40000000, 40000000, 200000000),
(9, 5, 'Series A', '2020-03-20', 250000000, 250000000, 1500000000),
(10, 5, 'Series B', '2022-07-15', 800000000, 800000000, 4000000000),
(11, 5, 'Series C', '2024-02-28', 1500000000, 750000000, 12000000000),
(12, 6, 'Seed', '2021-09-09', 50000000, 50000000, 250000000),
(13, 7, 'Seed', '2020-06-12', 60000000, 60000000, 300000000),
(14, 7, 'Series A', '2023-11-22', 250000000, 100000000, 1200000000),
(15, 8, 'Pre-Seed', '2022-12-01', 30000000, 30000000, 120000000);

-- 8. INVESTMENTS
INSERT IGNORE INTO INVESTMENT (investment_id, investor_id, round_id, amount_invested, equity_acquired, investment_date, deal_reference) VALUES
(1, 1, 1, 25000000, 10, '2019-11-10', 'REF-1001'),
(2, 2, 1, 25000000, 10, '2019-11-12', 'REF-2001'),
(3, 4, 2, 200000000, 16.67, '2021-04-15', 'REF-3002'),
(4, 5, 3, 400000000, 10, '2023-09-01', 'REF-4003'),
(5, 3, 4, 30000000, 20, '2019-02-20', 'REF-5004'),
(6, 1, 5, 300000000, 20, '2022-08-11', 'REF-6005'),
(7, 2, 6, 80000000, 26.67, '2021-05-14', 'REF-7006'),
(8, 6, 7, 20000000, 25, '2022-10-05', 'REF-8007'),
(9, 4, 8, 40000000, 20, '2018-01-10', 'REF-9008'),
(10, 5, 9, 250000000, 16.67, '2020-03-20', 'REF-10009'),
(11, 1, 10, 800000000, 20, '2022-07-15', 'REF-110010'),
(12, 2, 11, 750000000, 6.25, '2024-02-28', 'REF-120011'),
(13, 3, 12, 50000000, 20, '2021-09-09', 'REF-130012'),
(14, 6, 13, 60000000, 20, '2020-06-12', 'REF-140013'),
(15, 4, 14, 100000000, 8.33, '2023-11-22', 'REF-150014'),
(16, 6, 15, 30000000, 25, '2022-12-01', 'REF-160015');

-- 9. EQUITY HISTORY
INSERT IGNORE INTO EQUITY_HISTORY (ownership_id, startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at) VALUES
(1, 1, 1, 1, NULL, 43.64, '2019-11-10 12:00:00'),
(2, 1, 1, 2, NULL, 36.36, '2019-11-10 12:00:00'),
(3, 1, 1, NULL, 1, 10.00, '2019-11-10 12:00:00'),
(4, 1, 1, NULL, 2, 10.00, '2019-11-10 12:00:00'),
(5, 1, 2, 1, NULL, 36.36, '2021-04-15 12:00:00'),
(6, 1, 2, 2, NULL, 30.30, '2021-04-15 12:00:00'),
(7, 1, 2, NULL, 1, 8.33, '2021-04-15 12:00:00'),
(8, 1, 2, NULL, 2, 8.33, '2021-04-15 12:00:00'),
(9, 1, 2, NULL, 4, 16.67, '2021-04-15 12:00:00'),
(10, 1, 3, 1, NULL, 32.73, '2023-09-01 12:00:00'),
(11, 1, 3, 2, NULL, 27.27, '2023-09-01 12:00:00'),
(12, 1, 3, NULL, 1, 7.50, '2023-09-01 12:00:00'),
(13, 1, 3, NULL, 2, 7.50, '2023-09-01 12:00:00'),
(14, 1, 3, NULL, 4, 15.00, '2023-09-01 12:00:00'),
(15, 1, 3, NULL, 5, 10.00, '2023-09-01 12:00:00'),
(16, 2, 4, 3, NULL, 80.00, '2019-02-20 12:00:00'),
(17, 2, 4, NULL, 3, 20.00, '2019-02-20 12:00:00'),
(18, 2, 5, 3, NULL, 64.00, '2022-08-11 12:00:00'),
(19, 2, 5, NULL, 3, 16.00, '2022-08-11 12:00:00'),
(20, 2, 5, NULL, 1, 20.00, '2022-08-11 12:00:00'),
(21, 3, 6, 4, NULL, 73.33, '2021-05-14 12:00:00'),
(22, 3, 6, NULL, 2, 26.67, '2021-05-14 12:00:00'),
(23, 4, 7, 5, NULL, 75.00, '2022-10-05 12:00:00'),
(24, 4, 7, NULL, 6, 25.00, '2022-10-05 12:00:00'),
(25, 5, 8, 6, NULL, 42.11, '2018-01-10 12:00:00'),
(26, 5, 8, 7, NULL, 37.89, '2018-01-10 12:00:00'),
(27, 5, 8, NULL, 4, 20.00, '2018-01-10 12:00:00'),
(28, 5, 9, 6, NULL, 35.09, '2020-03-20 12:00:00'),
(29, 5, 9, 7, NULL, 31.58, '2020-03-20 12:00:00'),
(30, 5, 9, NULL, 4, 16.67, '2020-03-20 12:00:00'),
(31, 5, 9, NULL, 5, 16.67, '2020-03-20 12:00:00'),
(32, 5, 10, 6, NULL, 28.07, '2022-07-15 12:00:00'),
(33, 5, 10, 7, NULL, 25.26, '2022-07-15 12:00:00'),
(34, 5, 10, NULL, 4, 13.33, '2022-07-15 12:00:00'),
(35, 5, 10, NULL, 5, 13.34, '2022-07-15 12:00:00'),
(36, 5, 10, NULL, 1, 20.00, '2022-07-15 12:00:00'),
(37, 5, 11, 6, NULL, 26.31, '2024-02-28 12:00:00'),
(38, 5, 11, 7, NULL, 23.68, '2024-02-28 12:00:00'),
(39, 5, 11, NULL, 4, 12.50, '2024-02-28 12:00:00'),
(40, 5, 11, NULL, 5, 12.50, '2024-02-28 12:00:00'),
(41, 5, 11, NULL, 1, 18.75, '2024-02-28 12:00:00'),
(42, 5, 11, NULL, 2, 6.25, '2024-02-28 12:00:00'),
(43, 6, 12, 8, NULL, 80.00, '2021-09-09 12:00:00'),
(44, 6, 12, NULL, 3, 20.00, '2021-09-09 12:00:00'),
(45, 7, 13, 9, NULL, 80.00, '2020-06-12 12:00:00'),
(46, 7, 13, NULL, 6, 20.00, '2020-06-12 12:00:00'),
(47, 7, 14, 9, NULL, 73.34, '2023-11-22 12:00:00'),
(48, 7, 14, NULL, 6, 18.33, '2023-11-22 12:00:00'),
(49, 7, 14, NULL, 4, 8.33, '2023-11-22 12:00:00'),
(50, 8, 15, 10, NULL, 75.00, '2022-12-01 12:00:00'),
(51, 8, 15, NULL, 6, 25.00, '2022-12-01 12:00:00');
