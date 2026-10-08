package com.smartsplit.smartsplit;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;

@Entity
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal paid;
    private BigDecimal newBalance;
    private BigDecimal finalTotal;

    @ManyToOne
    private Bill bill;

    @ManyToMany(mappedBy = "people")
    private List<Item> items;

    public Person(String name) {
        this.name = name;
        paid = new BigDecimal("0");
        newBalance = new BigDecimal("0");
        finalTotal = new BigDecimal("0");
        items = new ArrayList<>();
    }

    protected Person() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getPaid() {
        return paid;
    }

    public void paid(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount paid can't be null");
        }

        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("amount paid can't be negative");
        }

        paid = amount;
    }

    public void setBalance(BigDecimal amount) {
        newBalance = amount;
    }

    public BigDecimal getBalance() {
        return newBalance;
    }

    public void setFinalTotal(BigDecimal amount) {
        finalTotal = amount;
    }

    public BigDecimal getFinalTotal() {
        return finalTotal;
    }

    public void setBill(Bill bill) {
        this.bill = bill;
    }

    public Long getId() {
        return id;
    }

    public List<Item> getItems() {
        return items;
    }
}
