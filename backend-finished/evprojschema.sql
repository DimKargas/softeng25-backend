DROP DATABASE IF EXISTS ev_charging_db;
CREATE DATABASE ev_charging_db;
USE ev_charging_db;

-- Πάροχος (Σταθερά από σελ. 3)
CREATE TABLE provider (
    id INT AUTO_INCREMENT PRIMARY KEY,
    providerName VARCHAR(255) DEFAULT 'bestPowerGR'
);

-- Point: Το κεντρικό στοιχείο (Outlet στο PUML / Point στην εκφώνηση)
CREATE TABLE point (
    pointid INT PRIMARY KEY,            -- Από το outlets -> id του JSON
    name VARCHAR(255),                  -- Από το name του JSON
    address TEXT,                       -- Από το address του JSON
    lon DECIMAL(11, 8),                 -- Από το longitude του JSON
    lat DECIMAL(10, 8),                 -- Από το latitude του JSON
    status ENUM('available', 'charging', 'reserved', 'malfunction', 'offline'),
    cap INT,                            -- Από το power/kilowatts του JSON
    kwhprice FLOAT DEFAULT 0.50,
    reservationendtime DATETIME NULL,
    provider_id INT DEFAULT 1,
    FOREIGN KEY (provider_id) REFERENCES provider(id)
);

-- Χρήστες (Με τα στοιχεία που ζήτησες)
CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin', 'user') DEFAULT 'user',
    name VARCHAR(100),
    surname VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    phone_number VARCHAR(20),
    address TEXT
);

-- Οχήματα
CREATE TABLE vehicle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    brand VARCHAR(50),
    model VARCHAR(50),
    license_plate VARCHAR(20) UNIQUE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Συνεδρίες (Sessions) - Σελίδες 5-6
CREATE TABLE session (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    pointid INT,
    user_id INT,
    vehicle_id INT,
    starttime DATETIME,
    endtime DATETIME,
    startsoc INT,
    endsoc INT,
    totalkwh FLOAT,
    kwhprice FLOAT,
    amount FLOAT,
    FOREIGN KEY (pointid) REFERENCES point(pointid),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);

-- Ιστορικό Καταστάσεων - Σελίδα 7
CREATE TABLE status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pointid INT,
    timeref DATETIME DEFAULT CURRENT_TIMESTAMP,
    old_state VARCHAR(50),
    new_state VARCHAR(50),
    FOREIGN KEY (pointid) REFERENCES point(pointid)
);

INSERT INTO provider (id, providerName) VALUES (1, 'bestPowerGR');