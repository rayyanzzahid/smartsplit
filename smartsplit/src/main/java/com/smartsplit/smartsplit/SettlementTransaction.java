package com.smartsplit.smartsplit;

import java.math.BigDecimal;

public class SettlementTransaction {

    private String from;
    private String to;
    private BigDecimal amount;

    public SettlementTransaction(String from, String to, BigDecimal amount) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }

    public String getFrom() {
        return from;
    }

    public String getTo() {
        return to;
    }

    public BigDecimal getAmount() {
        return amount;
    }
}