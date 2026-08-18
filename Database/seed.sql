-- ============================================================
-- SFITS DBMS - Seed Data (Indian Startup Ecosystem)
-- Run after schema.sql:
-- mysql -u root -p SFITS_DBMS_PRJ < Database/seed.sql
-- ============================================================

USE SFITS_DBMS_PRJ;

-- 1. USERS
INSERT IGNORE INTO
    USERS (
        user_id,
        username,
        email,
        password,
        role
    )
VALUES (
        1,
        'Vaishnavi Karve',
        'vaishnavi@gmail.com',
        'pass123',
        'founder'
    ),
    (
        2,
        'Tejal Udgave',
        'tejal@gmail.com',
        'pass123',
        'founder'
    ),
    (
        3,
        'Trupti Mete',
        'trupti@gmail.com',
        'pass123',
        'investor'
    ),
    (
        4,
        'Rohit Singh',
        'rohit@gmail.com',
        'pass123',
        'investor'
    ),
    (
        5,
        'Deepinder Goyal',
        'deepinder@gmail.com',
        'pass123',
        'founder'
    ),
    (
        6,
        'Harshil Mathur',
        'harshil@gmail.com',
        'pass123',
        'founder'
    ),
    (
        7,
        'Kunal Shah',
        'kunal@gmail.com',
        'pass123',
        'founder'
    ),
    (
        8,
        'Nithin Kamath',
        'nithin@gmail.com',
        'pass123',
        'founder'
    ),
    (
        9,
        'Anupam Mittal',
        'anupam@gmail.com',
        'pass123',
        'investor'
    ),
    (
        10,
        'Namita Thapar',
        'namita@gmail.com',
        'pass123',
        'investor'
    );

-- 2. INDUSTRIES
INSERT IGNORE INTO
    INDUSTRY (industry_id, industry_name)
VALUES (1, 'FinTech'),
    (2, 'HealthTech'),
    (3, 'EdTech'),
    (4, 'E-Commerce'),
    (5, 'FoodTech'),
    (6, 'Logistics'),
    (7, 'AgriTech'),
    (8, 'Mobility'),
    (9, 'Beauty & Fashion'),
    (10, 'SaaS'),
    (11, 'Gaming'),
    (12, 'Social Media');

-- 3. STARTUPS
INSERT IGNORE INTO
    STARTUP (
        startup_id,
        startup_name,
        founded_year,
        stage,
        city,
        state,
        country,
        industry_id,
        user_id
    )
VALUES (
        1,
        'Razorpay',
        2014,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        1,
        6
    ),
    (
        2,
        'CRED',
        2018,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        1,
        7
    ),
    (
        3,
        'Zerodha',
        2010,
        'Seed',
        'Bangalore',
        'Karnataka',
        'India',
        1,
        8
    ),
    (
        4,
        'PhonePe',
        2015,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        1,
        NULL
    ),
    (
        5,
        'Zomato',
        2008,
        'Series C',
        'Gurugram',
        'Haryana',
        'India',
        5,
        5
    ),
    (
        6,
        'Swiggy',
        2014,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        5,
        NULL
    ),
    (
        7,
        'Flipkart',
        2007,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        4,
        NULL
    ),
    (
        8,
        'Nykaa',
        2012,
        'Series C',
        'Mumbai',
        'Maharashtra',
        'India',
        9,
        NULL
    ),
    (
        9,
        'Meesho',
        2015,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        4,
        NULL
    ),
    (
        10,
        'Ola',
        2010,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        8,
        NULL
    ),
    (
        11,
        'PharmEasy',
        2015,
        'Series C',
        'Mumbai',
        'Maharashtra',
        'India',
        2,
        NULL
    ),
    (
        12,
        'Practo',
        2008,
        'Series B',
        'Bangalore',
        'Karnataka',
        'India',
        2,
        NULL
    ),
    (
        13,
        'BYJUS',
        2011,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        3,
        NULL
    ),
    (
        14,
        'Unacademy',
        2015,
        'Series C',
        'Bangalore',
        'Karnataka',
        'India',
        3,
        NULL
    ),
    (
        15,
        'QuickPay',
        2023,
        'Seed',
        'Mumbai',
        'Maharashtra',
        'India',
        1,
        1
    ),
    (
        16,
        'MedAssist',
        2024,
        'Pre-Seed',
        'Pune',
        'Maharashtra',
        'India',
        2,
        2
    );

-- 4. FOUNDERS
INSERT IGNORE INTO
    FOUNDER (
        founder_id,
        founder_name,
        founder_email,
        founder_role,
        initial_equity,
        startup_id,
        user_id
    )
VALUES (
        1,
        'Deepinder Goyal',
        'deepinder@gmail.com',
        'CEO & Founder',
        51.00,
        5,
        5
    ),
    (
        2,
        'Harshil Mathur',
        'harshil@gmail.com',
        'CEO & Co-Founder',
        30.00,
        1,
        6
    ),
    (
        3,
        'Shashank Kumar',
        'shashank@gmail.com',
        'CTO & Co-Founder',
        30.00,
        1,
        NULL
    ),
    (
        4,
        'Kunal Shah',
        'kunal@gmail.com',
        'Founder & CEO',
        12.00,
        2,
        7
    ),
    (
        5,
        'Bhavish Aggarwal',
        'bhavish@gmail.com',
        'CEO & Co-Founder',
        35.00,
        10,
        NULL
    ),
    (
        6,
        'Ankit Bhati',
        'ankit.bhati@gmail.com',
        'CTO & Co-Founder',
        10.00,
        10,
        NULL
    ),
    (
        7,
        'Nithin Kamath',
        'nithin@gmail.com',
        'CEO & Co-Founder',
        50.00,
        3,
        8
    ),
    (
        8,
        'Nikhil Kamath',
        'nikhil@gmail.com',
        'Co-Founder',
        50.00,
        3,
        NULL
    ),
    (
        9,
        'Falguni Nayar',
        'falguni@gmail.com',
        'Founder & CEO',
        53.50,
        8,
        NULL
    ),
    (
        10,
        'Sriharsha Majety',
        'sriharsha@gmail.com',
        'CEO & Co-Founder',
        25.00,
        6,
        NULL
    ),
    (
        11,
        'Nandan Reddy',
        'nandan@gmail.com',
        'Co-Founder',
        15.00,
        6,
        NULL
    ),
    (
        12,
        'Kalyan Krishnamurthy',
        'kalyan@gmail.com',
        'CEO',
        5.00,
        7,
        NULL
    ),
    (
        13,
        'Vaishnavi Karve',
        'vaishnavi@gmail.com',
        'CEO & Founder',
        60.00,
        15,
        1
    ),
    (
        14,
        'Tejal Udgave',
        'tejal@gmail.com',
        'CTO & Founder',
        55.00,
        16,
        2
    );

-- 5. INVESTORS
INSERT IGNORE INTO
    INVESTOR (
        investor_id,
        investor_name,
        firm_name,
        investor_type,
        country,
        user_id,
        is_visible
    )
VALUES (
        1,
        'Trupti Mete',
        'Mete Ventures',
        'Angel',
        'India',
        3,
        1
    ),
    (
        2,
        'Rohit Singh',
        'Singh Capital',
        'VC',
        'India',
        4,
        1
    ),
    (
        3,
        'Rajan Anandan',
        'Peak XV Partners',
        'VC',
        'India',
        NULL,
        1
    ),
    (
        4,
        'Shailendra Singh',
        'Peak XV Partners',
        'VC',
        'India',
        NULL,
        1
    ),
    (
        5,
        'Lee Fixel',
        'Tiger Global',
        'VC',
        'USA',
        NULL,
        1
    ),
    (
        6,
        'Subrata Mitra',
        'Accel India',
        'VC',
        'India',
        NULL,
        1
    ),
    (
        7,
        'Karthik Reddy',
        'Blume Ventures',
        'VC',
        'India',
        NULL,
        1
    ),
    (
        8,
        'Kunal Bahl',
        'Titan Capital',
        'Angel',
        'India',
        NULL,
        1
    ),
    (
        9,
        'Prosus Ventures',
        'Prosus',
        'Corporate',
        'Netherlands',
        NULL,
        1
    ),
    (
        10,
        'SoftBank Vision',
        'SoftBank Group',
        'VC',
        'Japan',
        NULL,
        1
    ),
    (
        11,
        'Masayoshi Son',
        'SoftBank Group',
        'VC',
        'Japan',
        NULL,
        1
    ),
    (
        12,
        'Avnish Bajaj',
        'Matrix Partners India',
        'VC',
        'India',
        NULL,
        1
    ),
    (
        13,
        'Sachin Bansal',
        'BAC Acquisitions',
        'Angel',
        'India',
        NULL,
        1
    ),
    (
        14,
        'Binny Bansal',
        'xto10x Technologies',
        'Angel',
        'India',
        NULL,
        1
    ),
    (
        15,
        'General Atlantic',
        'General Atlantic',
        'Private Equity',
        'USA',
        NULL,
        1
    ),
    (
        16,
        'DST Global',
        'DST Global',
        'VC',
        'Hong Kong',
        NULL,
        1
    ),
    (
        17,
        'Steadview Capital',
        'Steadview Capital',
        'Hedge Fund',
        'UK',
        NULL,
        1
    ),
    (
        18,
        'Ribbit Capital',
        'Ribbit Capital',
        'VC',
        'USA',
        NULL,
        1
    ),
    (
        19,
        'Anupam Mittal',
        'Shaadi.com Ventures',
        'Angel',
        'India',
        9,
        1
    ),
    (
        20,
        'Namita Thapar',
        'Emcure Ventures',
        'Angel',
        'India',
        10,
        1
    );

-- 6. INVESTOR FOCUS INDUSTRIES
INSERT IGNORE INTO
    INVESTOR_FOCUS_INDUSTRY (investor_id, industry_id)
VALUES (1, 1),
    (1, 2),
    (2, 3),
    (2, 4),
    (3, 1),
    (3, 5),
    (3, 4),
    (4, 1),
    (4, 5),
    (4, 8),
    (5, 1),
    (5, 4),
    (5, 5),
    (6, 1),
    (6, 5),
    (6, 10),
    (7, 1),
    (7, 2),
    (7, 10),
    (8, 1),
    (8, 5),
    (8, 4),
    (9, 5),
    (9, 4),
    (10, 8),
    (10, 4),
    (10, 5),
    (11, 8),
    (11, 4),
    (12, 1),
    (12, 5),
    (13, 1),
    (13, 4),
    (14, 1),
    (14, 10),
    (15, 1),
    (15, 4),
    (15, 9),
    (16, 5),
    (16, 4),
    (17, 1),
    (17, 5),
    (18, 1),
    (19, 4),
    (19, 10),
    (20, 2),
    (20, 3);

-- 7. FUNDING ROUNDS
INSERT IGNORE INTO
    FUNDING_ROUND (
        round_id,
        round_type,
        round_date,
        valuation,
        total_amount_raised,
        startup_id
    )
VALUES (
        1,
        'Seed',
        '2015-05-20',
        50000000,
        9000000,
        1
    ),
    (
        2,
        'Series A',
        '2016-10-12',
        500000000,
        120000000,
        1
    ),
    (
        3,
        'Series B',
        '2018-06-15',
        2500000000,
        500000000,
        1
    ),
    (
        4,
        'Series C',
        '2020-10-08',
        10000000000,
        1000000000,
        1
    ),
    (
        5,
        'Seed',
        '2018-11-01',
        300000000,
        250000000,
        2
    ),
    (
        6,
        'Series A',
        '2019-08-20',
        2500000000,
        600000000,
        2
    ),
    (
        7,
        'Series B',
        '2020-12-15',
        8000000000,
        1500000000,
        2
    ),
    (
        8,
        'Series C',
        '2021-10-08',
        50000000000,
        3500000000,
        2
    ),
    (
        9,
        'Initial',
        '2010-08-15',
        1000000,
        500000,
        3
    ),
    (
        10,
        'Series A',
        '2017-04-10',
        5000000000,
        1500000000,
        4
    ),
    (
        11,
        'Series B',
        '2019-12-20',
        55000000000,
        5600000000,
        4
    ),
    (
        12,
        'Series C',
        '2022-01-10',
        100000000000,
        7000000000,
        4
    ),
    (
        13,
        'Seed',
        '2010-01-15',
        5000000,
        1000000,
        5
    ),
    (
        14,
        'Series A',
        '2013-02-20',
        500000000,
        168000000,
        5
    ),
    (
        15,
        'Series B',
        '2015-04-10',
        10000000000,
        3500000000,
        5
    ),
    (
        16,
        'Series C',
        '2018-10-25',
        30000000000,
        4100000000,
        5
    ),
    (
        17,
        'Seed',
        '2015-04-12',
        25000000,
        2500000,
        6
    ),
    (
        18,
        'Series A',
        '2016-01-18',
        500000000,
        150000000,
        6
    ),
    (
        19,
        'Series B',
        '2017-05-29',
        5000000000,
        800000000,
        6
    ),
    (
        20,
        'Series C',
        '2021-07-20',
        55000000000,
        12000000000,
        6
    ),
    (
        21,
        'Seed',
        '2009-06-01',
        10000000,
        1000000,
        7
    ),
    (
        22,
        'Series A',
        '2010-04-15',
        250000000,
        100000000,
        7
    ),
    (
        23,
        'Series B',
        '2012-08-20',
        10000000000,
        1500000000,
        7
    ),
    (
        24,
        'Series C',
        '2014-07-29',
        120000000000,
        10000000000,
        7
    ),
    (
        25,
        'Seed',
        '2012-10-01',
        50000000,
        25000000,
        8
    ),
    (
        26,
        'Series A',
        '2015-03-20',
        800000000,
        200000000,
        8
    ),
    (
        27,
        'Series C',
        '2020-05-10',
        70000000000,
        2600000000,
        8
    ),
    (
        28,
        'Seed',
        '2011-04-01',
        30000000,
        3000000,
        10
    ),
    (
        29,
        'Series A',
        '2013-07-15',
        500000000,
        200000000,
        10
    ),
    (
        30,
        'Series B',
        '2015-04-20',
        30000000000,
        4200000000,
        10
    ),
    (
        31,
        'Series C',
        '2017-10-10',
        50000000000,
        11000000000,
        10
    ),
    (
        32,
        'Seed',
        '2013-09-01',
        100000000,
        50000000,
        13
    ),
    (
        33,
        'Series A',
        '2016-03-28',
        5000000000,
        750000000,
        13
    ),
    (
        34,
        'Series C',
        '2019-07-25',
        100000000000,
        5400000000,
        13
    ),
    (
        35,
        'Seed',
        '2016-08-15',
        50000000,
        10000000,
        14
    ),
    (
        36,
        'Series A',
        '2018-06-12',
        700000000,
        175000000,
        14
    ),
    (
        37,
        'Series C',
        '2021-08-30',
        30000000000,
        4400000000,
        14
    ),
    (
        38,
        'Pre-Seed',
        '2024-06-15',
        5000000,
        1200000,
        15
    ),
    (
        39,
        'Seed',
        '2025-01-10',
        30000000,
        8000000,
        15
    ),
    (
        40,
        'Pre-Seed',
        '2025-03-01',
        3000000,
        800000,
        16
    );

-- 8. INVESTMENTS
INSERT IGNORE INTO
    INVESTMENT (
        investment_id,
        investor_id,
        round_id,
        amount_invested,
        equity_acquired,
        deal_reference
    )
VALUES (
        1,
        5,
        2,
        80000000,
        8.00,
        'REF-RZP-A-TIGER'
    ),
    (
        2,
        12,
        2,
        40000000,
        4.00,
        'REF-RZP-A-MATRIX'
    ),
    (
        3,
        4,
        3,
        250000000,
        5.00,
        'REF-RZP-B-PEAKXV'
    ),
    (
        4,
        5,
        3,
        250000000,
        5.00,
        'REF-RZP-B-TIGER'
    ),
    (
        5,
        18,
        4,
        500000000,
        3.00,
        'REF-RZP-C-RIBBIT'
    ),
    (
        6,
        4,
        4,
        300000000,
        2.00,
        'REF-RZP-C-PEAKXV'
    ),
    (
        7,
        15,
        4,
        200000000,
        1.50,
        'REF-RZP-C-GA'
    ),
    (
        8,
        4,
        5,
        150000000,
        25.00,
        'REF-CRED-SEED-PEAKXV'
    ),
    (
        9,
        5,
        6,
        300000000,
        8.00,
        'REF-CRED-A-TIGER'
    ),
    (
        10,
        16,
        7,
        800000000,
        6.00,
        'REF-CRED-B-DST'
    ),
    (
        11,
        5,
        8,
        2000000000,
        3.00,
        'REF-CRED-C-TIGER'
    ),
    (
        12,
        17,
        8,
        1500000000,
        2.00,
        'REF-CRED-C-STEADVIEW'
    ),
    (
        13,
        3,
        13,
        500000,
        5.00,
        'REF-ZOM-SEED-PEAKXV'
    ),
    (
        14,
        4,
        14,
        84000000,
        8.00,
        'REF-ZOM-A-PEAKXV'
    ),
    (
        15,
        6,
        14,
        84000000,
        8.00,
        'REF-ZOM-A-ACCEL'
    ),
    (
        16,
        5,
        15,
        1500000000,
        7.00,
        'REF-ZOM-B-TIGER'
    ),
    (
        17,
        13,
        16,
        400000000,
        1.00,
        'REF-ZOM-C-SACHIN'
    ),
    (
        18,
        6,
        17,
        1500000,
        3.00,
        'REF-SWG-SEED-ACCEL'
    ),
    (
        19,
        9,
        19,
        500000000,
        6.00,
        'REF-SWG-B-PROSUS'
    ),
    (
        20,
        10,
        20,
        5000000000,
        5.00,
        'REF-SWG-C-SOFTBANK'
    ),
    (
        21,
        9,
        20,
        4000000000,
        4.00,
        'REF-SWG-C-PROSUS'
    ),
    (
        22,
        6,
        21,
        500000,
        10.00,
        'REF-FLK-SEED-ACCEL'
    ),
    (
        23,
        5,
        22,
        60000000,
        12.00,
        'REF-FLK-A-TIGER'
    ),
    (
        24,
        9,
        23,
        800000000,
        5.00,
        'REF-FLK-B-PROSUS'
    ),
    (
        25,
        5,
        24,
        5000000000,
        3.00,
        'REF-FLK-C-TIGER'
    ),
    (
        26,
        16,
        24,
        3000000000,
        2.00,
        'REF-FLK-C-DST'
    ),
    (
        27,
        10,
        24,
        2000000000,
        1.50,
        'REF-FLK-C-SOFTBANK'
    ),
    (
        28,
        15,
        26,
        100000000,
        6.00,
        'REF-NYK-A-GA'
    ),
    (
        29,
        17,
        27,
        1200000000,
        1.50,
        'REF-NYK-C-STEADVIEW'
    ),
    (
        30,
        5,
        29,
        100000000,
        8.00,
        'REF-OLA-A-TIGER'
    ),
    (
        31,
        10,
        30,
        2000000000,
        5.00,
        'REF-OLA-B-SOFTBANK'
    ),
    (
        32,
        10,
        31,
        7000000000,
        10.00,
        'REF-OLA-C-SOFTBANK'
    ),
    (
        33,
        4,
        32,
        30000000,
        15.00,
        'REF-BYJUS-SEED-PEAKXV'
    ),
    (
        34,
        5,
        33,
        500000000,
        5.00,
        'REF-BYJUS-A-TIGER'
    ),
    (
        35,
        15,
        34,
        2000000000,
        1.50,
        'REF-BYJUS-C-GA'
    ),
    (
        36,
        9,
        34,
        1500000000,
        1.00,
        'REF-BYJUS-C-PROSUS'
    ),
    (
        37,
        7,
        35,
        5000000,
        5.00,
        'REF-UNA-SEED-BLUME'
    ),
    (
        38,
        4,
        36,
        100000000,
        7.00,
        'REF-UNA-A-PEAKXV'
    ),
    (
        39,
        10,
        37,
        2000000000,
        4.00,
        'REF-UNA-C-SOFTBANK'
    ),
    (
        40,
        15,
        37,
        1500000000,
        3.00,
        'REF-UNA-C-GA'
    ),
    (
        41,
        1,
        38,
        800000,
        8.00,
        'REF-QP-PRE-METE'
    ),
    (
        42,
        2,
        38,
        400000,
        4.00,
        'REF-QP-PRE-SINGH'
    ),
    (
        43,
        1,
        39,
        4000000,
        6.00,
        'REF-QP-SEED-METE'
    ),
    (
        44,
        7,
        39,
        4000000,
        6.00,
        'REF-QP-SEED-BLUME'
    ),
    (
        45,
        2,
        40,
        500000,
        10.00,
        'REF-MA-PRE-SINGH'
    ),
    (
        46,
        8,
        40,
        300000,
        6.00,
        'REF-MA-PRE-TITAN'
    );

-- 9. EQUITY HISTORY
INSERT IGNORE INTO
    EQUITY_HISTORY (
        ownership_id,
        startup_id,
        round_id,
        founder_id,
        investor_id,
        equity_percentage
    )
VALUES (1, 1, 4, 2, NULL, 22.00),
    (2, 1, 4, 3, NULL, 22.00),
    (3, 1, 4, NULL, 5, 13.00),
    (4, 1, 4, NULL, 4, 7.00),
    (5, 1, 4, NULL, 18, 3.00),
    (6, 1, 4, NULL, 12, 4.00),
    (7, 1, 4, NULL, 15, 1.50),
    (8, 2, 8, 4, NULL, 12.00),
    (9, 2, 8, NULL, 4, 25.00),
    (10, 2, 8, NULL, 5, 11.00),
    (11, 2, 8, NULL, 16, 6.00),
    (12, 2, 8, NULL, 17, 2.00),
    (13, 3, 9, 7, NULL, 50.00),
    (14, 3, 9, 8, NULL, 50.00),
    (15, 5, 16, 1, NULL, 4.70),
    (16, 5, 16, NULL, 3, 5.00),
    (17, 5, 16, NULL, 4, 8.00),
    (18, 5, 16, NULL, 5, 7.00),
    (19, 5, 16, NULL, 6, 8.00),
    (20, 5, 16, NULL, 13, 1.00),
    (21, 6, 20, 10, NULL, 5.00),
    (22, 6, 20, 11, NULL, 3.00),
    (23, 6, 20, NULL, 9, 10.00),
    (24, 6, 20, NULL, 10, 5.00),
    (25, 6, 20, NULL, 6, 3.00),
    (26, 7, 24, 12, NULL, 5.00),
    (27, 7, 24, NULL, 5, 15.00),
    (28, 7, 24, NULL, 6, 10.00),
    (29, 7, 24, NULL, 9, 5.00),
    (30, 7, 24, NULL, 16, 2.00),
    (31, 7, 24, NULL, 10, 1.50),
    (32, 8, 27, 9, NULL, 53.50),
    (33, 8, 27, NULL, 15, 6.00),
    (34, 8, 27, NULL, 17, 1.50),
    (35, 10, 31, 5, NULL, 10.00),
    (36, 10, 31, 6, NULL, 5.00),
    (37, 10, 31, NULL, 5, 8.00),
    (38, 10, 31, NULL, 10, 15.00),
    (39, 15, 39, 13, NULL, 46.00),
    (40, 15, 39, NULL, 1, 14.00),
    (41, 15, 39, NULL, 2, 4.00),
    (42, 15, 39, NULL, 7, 6.00),
    (43, 16, 40, 14, NULL, 39.00),
    (44, 16, 40, NULL, 2, 10.00),
    (45, 16, 40, NULL, 8, 6.00);