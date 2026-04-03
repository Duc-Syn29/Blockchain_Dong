
CREATE TABLE Users (
    WalletAddress CHAR(42) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    Nonce VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL DEFAULT 'Attendee',
    AccountStatus VARCHAR(20) NOT NULL DEFAULT 'Active',
    DisplayName VARCHAR(100),
    Email VARCHAR(100) UNIQUE,
    AvatarURL VARCHAR(500),
    LastLoginAt DATETIME NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role
        CHECK (Role IN ('Admin', 'Organizer', 'Staff', 'Attendee')),
    CONSTRAINT chk_users_status
        CHECK (AccountStatus IN ('Active', 'Suspended', 'Deleted'))
) ENGINE=InnoDB;
CREATE TABLE Categories (
    CategoryID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(255) NULL
) ENGINE=InnoDB;
CREATE TABLE Events (
    EventID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    OrganizerWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ContractAddress CHAR(42) CHARACTER SET ascii COLLATE ascii_bin UNIQUE NULL,
    ChainID BIGINT UNSIGNED NULL,

    Title VARCHAR(255) NOT NULL,
    Slug VARCHAR(255) NOT NULL UNIQUE,
    Description TEXT,

    VenueName VARCHAR(255) NULL,
    Location VARCHAR(255) NOT NULL,
    Latitude DECIMAL(10,7) NULL,
    Longitude DECIMAL(10,7) NULL,

    StartTime DATETIME NOT NULL,
    EndTime DATETIME NOT NULL,

    PosterURL VARCHAR(500) NULL,
    BannerURL VARCHAR(500) NULL,

    Status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    Visibility VARCHAR(20) NOT NULL DEFAULT 'Public',
    Capacity INT UNSIGNED NULL,

    RoyaltyFee DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    IsRefundable BOOLEAN NOT NULL DEFAULT TRUE,
    RefundPolicy TEXT NULL,

    PublishedAt DATETIME NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_organizer
        FOREIGN KEY (OrganizerWallet) REFERENCES Users(WalletAddress),

    CONSTRAINT chk_events_status
        CHECK (Status IN ('Draft', 'Published', 'Cancelled', 'Completed')),
    CONSTRAINT chk_events_visibility
        CHECK (Visibility IN ('Public', 'Private', 'Unlisted')),
    CONSTRAINT chk_events_time
        CHECK (EndTime > StartTime),
    CONSTRAINT chk_events_royalty
        CHECK (RoyaltyFee >= 0 AND RoyaltyFee <= 100),
    CONSTRAINT chk_events_capacity
        CHECK (Capacity IS NULL OR Capacity > 0)
) ENGINE=InnoDB;
CREATE TABLE Event_Categories (
    EventID BIGINT UNSIGNED NOT NULL,
    CategoryID INT UNSIGNED NOT NULL,
    PRIMARY KEY (EventID, CategoryID),

    CONSTRAINT fk_event_categories_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT fk_event_categories_category
        FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Event_Media (
    MediaID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EventID BIGINT UNSIGNED NOT NULL,
    MediaType VARCHAR(20) NOT NULL DEFAULT 'Image',
    MediaURL VARCHAR(500) NOT NULL,
    SortOrder INT UNSIGNED NOT NULL DEFAULT 0,
    IsPrimary BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_media_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,

    CONSTRAINT chk_event_media_type
        CHECK (MediaType IN ('Image', 'Video'))
) ENGINE=InnoDB;

CREATE TABLE Event_Staff (
    EventID BIGINT UNSIGNED NOT NULL,
    StaffWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    StaffRole VARCHAR(20) NOT NULL DEFAULT 'Scanner',
    AssignedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (EventID, StaffWallet),

    CONSTRAINT fk_event_staff_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT fk_event_staff_wallet
        FOREIGN KEY (StaffWallet) REFERENCES Users(WalletAddress) ON DELETE CASCADE,

    CONSTRAINT chk_event_staff_role
        CHECK (StaffRole IN ('Scanner', 'Manager', 'Moderator'))
) ENGINE=InnoDB;

CREATE TABLE Notifications (
    NotifID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    WalletAddress CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    NotifType VARCHAR(30) NOT NULL DEFAULT 'System',
    Title VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL,
    LinkURL VARCHAR(500) NULL,
    IsRead BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_wallet
        FOREIGN KEY (WalletAddress) REFERENCES Users(WalletAddress) ON DELETE CASCADE,

    CONSTRAINT chk_notifications_type
        CHECK (NotifType IN ('System', 'Order', 'Refund', 'Event', 'Checkin'))
) ENGINE=InnoDB;

CREATE TABLE Ticket_Tiers (
    TierID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EventID BIGINT UNSIGNED NOT NULL,
    TierName VARCHAR(100) NOT NULL,
    Description VARCHAR(255) NULL,

    MaxSupply INT UNSIGNED NOT NULL,
    CurrentSupply INT UNSIGNED NOT NULL DEFAULT 0,

    Price DECIMAL(36,18) NOT NULL DEFAULT 0,
    Currency VARCHAR(10) NOT NULL DEFAULT 'ETH',

    PerWalletLimit INT UNSIGNED NOT NULL DEFAULT 0, -- 0 = unlimited
    Transferable BOOLEAN NOT NULL DEFAULT TRUE,
    MetadataURI VARCHAR(500) NULL,

    SaleStartTime DATETIME NOT NULL,
    SaleEndTime DATETIME NOT NULL,

    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_tiers_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,

    CONSTRAINT uq_ticket_tier_name
        UNIQUE (EventID, TierName),

    CONSTRAINT chk_ticket_tiers_supply
        CHECK (MaxSupply > 0 AND CurrentSupply <= MaxSupply),
    CONSTRAINT chk_ticket_tiers_price
        CHECK (Price >= 0),
    CONSTRAINT chk_ticket_tiers_sale_time
        CHECK (SaleEndTime > SaleStartTime)
) ENGINE=InnoDB;

CREATE TABLE Orders (
    OrderID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    OrderCode CHAR(36) NOT NULL UNIQUE,
    WalletAddress CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    EventID BIGINT UNSIGNED NOT NULL,
    TierID BIGINT UNSIGNED NOT NULL,

    Quantity INT UNSIGNED NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(36,18) NOT NULL,
    TotalAmount DECIMAL(36,18) NOT NULL,
    Currency VARCHAR(10) NOT NULL DEFAULT 'ETH',

    OrderStatus VARCHAR(20) NOT NULL DEFAULT 'Pending',
    ExpiresAt DATETIME NULL,
    PaidAt DATETIME NULL,

    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_wallet
        FOREIGN KEY (WalletAddress) REFERENCES Users(WalletAddress),
    CONSTRAINT fk_orders_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT fk_orders_tier
        FOREIGN KEY (TierID) REFERENCES Ticket_Tiers(TierID) ON DELETE CASCADE,

    CONSTRAINT chk_orders_qty
        CHECK (Quantity > 0),
    CONSTRAINT chk_orders_amount
        CHECK (UnitPrice >= 0 AND TotalAmount >= 0),
    CONSTRAINT chk_orders_status
        CHECK (OrderStatus IN ('Pending', 'Paid', 'Expired', 'Cancelled', 'Refunded'))
) ENGINE=InnoDB;

CREATE TABLE Transactions (
    TxHash CHAR(66) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    EventID BIGINT UNSIGNED NOT NULL,
    OrderID BIGINT UNSIGNED NULL,

    FromWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ToWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NULL,

    TokenID BIGINT UNSIGNED NULL,
    TxType VARCHAR(20) NOT NULL,
    Amount DECIMAL(36,18) NOT NULL,
    Currency VARCHAR(10) NOT NULL DEFAULT 'ETH',
    GasFee DECIMAL(36,18) NULL,

    BlockNumber BIGINT UNSIGNED NOT NULL,
    BlockTime DATETIME(6) NOT NULL,
    TxStatus VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
    Network VARCHAR(50) NULL,

    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_order
        FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE SET NULL,

    CONSTRAINT chk_transactions_type
        CHECK (TxType IN ('Mint', 'Transfer', 'Resale', 'Refund', 'Burn')),
    CONSTRAINT chk_transactions_amount
        CHECK (Amount >= 0),
    CONSTRAINT chk_transactions_status
        CHECK (TxStatus IN ('Pending', 'Confirmed', 'Failed'))
) ENGINE=InnoDB;

CREATE TABLE Tickets (
    TicketID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    TierID BIGINT UNSIGNED NOT NULL,
    EventID BIGINT UNSIGNED NOT NULL,
    OrderID BIGINT UNSIGNED NULL,

    TokenID BIGINT UNSIGNED NOT NULL,
    OwnerWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    MintTxHash CHAR(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    MetadataURI VARCHAR(500) NULL,
    SeatLabel VARCHAR(50) NULL,

    IsUsed BOOLEAN NOT NULL DEFAULT FALSE,
    UsedAt DATETIME NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Valid',

    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tickets_tier
        FOREIGN KEY (TierID) REFERENCES Ticket_Tiers(TierID) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_owner
        FOREIGN KEY (OwnerWallet) REFERENCES Users(WalletAddress),
    CONSTRAINT fk_tickets_order
        FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE SET NULL,

    CONSTRAINT uq_ticket_event_token
        UNIQUE (EventID, TokenID),
    CONSTRAINT uq_ticket_mint_tx
        UNIQUE (MintTxHash),

    CONSTRAINT chk_tickets_status
        CHECK (Status IN ('Valid', 'Used', 'Transferred', 'Refunded', 'Burned'))
) ENGINE=InnoDB;

CREATE TABLE Checkin_Logs (
    LogID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EventID BIGINT UNSIGNED NOT NULL,
    TicketID BIGINT UNSIGNED NOT NULL,
    TokenID BIGINT UNSIGNED NOT NULL,
    ScannerWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ScanTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(20) NOT NULL,
    Note VARCHAR(255) NULL,

    CONSTRAINT fk_checkin_logs_event
        FOREIGN KEY (EventID) REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_logs_ticket
        FOREIGN KEY (TicketID) REFERENCES Tickets(TicketID) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_logs_scanner
        FOREIGN KEY (ScannerWallet) REFERENCES Users(WalletAddress),

    CONSTRAINT chk_checkin_logs_status
        CHECK (Status IN ('Success', 'AlreadyUsed', 'Invalid', 'WrongEvent'))
) ENGINE=InnoDB;

CREATE TABLE Refunds (
    RefundID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    TicketID BIGINT UNSIGNED NOT NULL,
    RequesterWallet CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    Reason VARCHAR(255) NULL,
    RefundAmount DECIMAL(36,18) NOT NULL,
    RefundStatus VARCHAR(20) NOT NULL DEFAULT 'Requested',

    RequestedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ProcessedAt DATETIME NULL,
    ProcessedBy CHAR(42) CHARACTER SET ascii COLLATE ascii_bin NULL,

    CONSTRAINT fk_refunds_ticket
        FOREIGN KEY (TicketID) REFERENCES Tickets(TicketID) ON DELETE CASCADE,
    CONSTRAINT fk_refunds_requester
        FOREIGN KEY (RequesterWallet) REFERENCES Users(WalletAddress),
    CONSTRAINT fk_refunds_processed_by
        FOREIGN KEY (ProcessedBy) REFERENCES Users(WalletAddress) ON DELETE SET NULL,

    CONSTRAINT chk_refunds_amount
        CHECK (RefundAmount >= 0),
    CONSTRAINT chk_refunds_status
        CHECK (RefundStatus IN ('Requested', 'Approved', 'Rejected', 'Paid'))
) ENGINE=InnoDB;

CREATE INDEX idx_events_organizer ON Events(OrganizerWallet);
CREATE INDEX idx_events_status_time ON Events(Status, StartTime);
CREATE INDEX idx_notifications_wallet_read ON Notifications(WalletAddress, IsRead, CreatedAt);

CREATE INDEX idx_ticket_tiers_event_time ON Ticket_Tiers(EventID, SaleStartTime, SaleEndTime);

CREATE INDEX idx_orders_wallet_status ON Orders(WalletAddress, OrderStatus, CreatedAt);
CREATE INDEX idx_orders_event_tier ON Orders(EventID, TierID);

CREATE INDEX idx_transactions_event_type ON Transactions(EventID, TxType, TxStatus);
CREATE INDEX idx_transactions_block ON Transactions(BlockNumber, BlockTime);
CREATE INDEX idx_transactions_token ON Transactions(EventID, TokenID);

CREATE INDEX idx_tickets_owner_status ON Tickets(OwnerWallet, Status);
CREATE INDEX idx_tickets_event_status ON Tickets(EventID, Status);
CREATE INDEX idx_tickets_tier ON Tickets(TierID);

CREATE INDEX idx_checkin_logs_event_time ON Checkin_Logs(EventID, ScanTime);
CREATE INDEX idx_checkin_logs_ticket ON Checkin_Logs(TicketID);

CREATE INDEX idx_refunds_ticket_status ON Refunds(TicketID, RefundStatus);

CREATE OR REPLACE VIEW vw_Event_Dashboard AS
SELECT
    e.EventID,
    e.Title,
    e.OrganizerWallet,
    e.Status,
    COALESCE(ts.TotalTicketsSold, 0) AS TotalTicketsSold,
    COALESCE(ts.TotalCheckedIn, 0) AS TotalCheckedIn,
    COALESCE(rv.TotalRevenue, 0) AS TotalRevenue
FROM Events e
LEFT JOIN (
    SELECT
        EventID,
        COUNT(*) AS TotalTicketsSold,
        SUM(CASE WHEN IsUsed = TRUE THEN 1 ELSE 0 END) AS TotalCheckedIn
    FROM Tickets
    WHERE Status IN ('Valid', 'Used', 'Transferred')
    GROUP BY EventID
) ts ON ts.EventID = e.EventID
LEFT JOIN (
    SELECT
        EventID,
        SUM(Amount) AS TotalRevenue
    FROM Transactions
    WHERE TxType = 'Mint'
      AND TxStatus = 'Confirmed'
    GROUP BY EventID
) rv ON rv.EventID = e.EventID;

DELIMITER $$

CREATE TRIGGER trg_before_ticket_insert
BEFORE INSERT ON Tickets
FOR EACH ROW
BEGIN
    DECLARE v_tier_event BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_current INT UNSIGNED DEFAULT NULL;
    DECLARE v_max INT UNSIGNED DEFAULT NULL;

    SELECT EventID, CurrentSupply, MaxSupply
    INTO v_tier_event, v_current, v_max
    FROM Ticket_Tiers
    WHERE TierID = NEW.TierID
    FOR UPDATE;

    IF v_tier_event IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ticket tier does not exist';
    END IF;

    IF v_tier_event <> NEW.EventID THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'TierID does not belong to EventID';
    END IF;

    IF v_current >= v_max THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tier sold out';
    END IF;
END$$

CREATE TRIGGER trg_after_ticket_insert
AFTER INSERT ON Tickets
FOR EACH ROW
BEGIN
    UPDATE Ticket_Tiers
    SET CurrentSupply = CurrentSupply + 1
    WHERE TierID = NEW.TierID;
END$$

CREATE TRIGGER trg_after_ticket_delete
AFTER DELETE ON Tickets
FOR EACH ROW
BEGIN
    UPDATE Ticket_Tiers
    SET CurrentSupply = CASE
        WHEN CurrentSupply > 0 THEN CurrentSupply - 1
        ELSE 0
    END
    WHERE TierID = OLD.TierID;
END$$

CREATE TRIGGER trg_before_ticket_update
BEFORE UPDATE ON Tickets
FOR EACH ROW
BEGIN
    IF OLD.TierID <> NEW.TierID OR OLD.EventID <> NEW.EventID THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Changing TierID/EventID of an existing ticket is not allowed';
    END IF;

    IF NEW.IsUsed = TRUE AND OLD.IsUsed = FALSE AND NEW.UsedAt IS NULL THEN
        SET NEW.UsedAt = CURRENT_TIMESTAMP;
        SET NEW.Status = 'Used';
    END IF;

    IF NEW.IsUsed = FALSE THEN
        SET NEW.UsedAt = NULL;
    END IF;
END$$

DELIMITER ;