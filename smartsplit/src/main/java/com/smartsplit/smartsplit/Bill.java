package com.smartsplit.smartsplit;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Column;

@Entity
public class Bill {
	
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(nullable = true)
	private String accessCodeHash;
	
	@OneToMany(mappedBy = "bill")
    private List<Person> people;
	
	@OneToMany(mappedBy = "bill")
    private List<Item> items;
	
    private BigDecimal tax;
    private BigDecimal tip;

    public Bill() {

        people = new ArrayList<>();
        items = new ArrayList<>();
        tax = BigDecimal.ZERO;
        tip = BigDecimal.ZERO;
    }
    
    

    public Person addPerson(String name) {
    	
    	if(name == null) {
    	    throw new IllegalArgumentException("Person name can't be null");
    	}

        String cleanName = name.trim();
    	
    	if(cleanName.isBlank()) {
    		throw new IllegalArgumentException("Person name can't be blank");
    	}
    	
    	if(findPerson(cleanName) != null) {
    		throw new IllegalArgumentException("Duplicate name can't be stored");
    	}
    	
        Person personObj = new Person(cleanName);
        personObj.setBill(this);
        people.add(personObj);
        return personObj;
    }


    public Item addItem(String iname, BigDecimal iprice, int quantity) {
    	
    	if (iname == null) {
    	    throw new IllegalArgumentException("Item name can't be null");
    	}
    	
    	if (iprice == null) {
    	    throw new IllegalArgumentException("Item price can't be null");
    	}
    	
    	if (iprice.compareTo(BigDecimal.ZERO) <= 0) {
    	    throw new IllegalArgumentException("Item price must be greater than zero");
    	}
    	
    	if (iname.isBlank()) {
    		throw new IllegalArgumentException("Item name can't be blank");
    	}
    	
    	if (quantity <= 0) {
    	    throw new IllegalArgumentException("Quantity must be greater than zero");
    	}
    	 
    	Item itemObj = new Item(iname, iprice, quantity);
    	itemObj.setBill(this);
        items.add(itemObj);
        
        return itemObj;
    }


    public Person findPerson(String pname) {
    	
        if (pname == null) {
            return null;
        }

        String cleanName = pname.trim();

        for (Person pObj : people) {
            if (pObj.getName().trim().equalsIgnoreCase(cleanName)) {
                return pObj;
            }
        }
        
        return null;
    }


    public Item findItem(String iname) {
    	
        for (Item iObj : items) {
            if (iObj.getItem().equals(iname)) {
                return iObj;
            }
        }
        
        return null;
    }
    
    
    public Item findItemById(Long itemId) {
    	
        for (Item iObj : items) {
            if (iObj.getId().equals(itemId)) {
                return iObj;
            }
        }
        
        return null;
    }


    public BigDecimal personTotal(Person person) {
    	
        BigDecimal total = BigDecimal.ZERO;
        
        if(findPerson(person.getName()) == null) {
    		throw new IllegalArgumentException("Person not inside this bill");
    	}
        
        for (Item iObj : items) {
            if (iObj.checkItem(person)) {
                total = total.add(iObj.calculateShare());
            }
        }
        
        return total;
    }


    public void addTax(BigDecimal amount) {
    	
    	if (amount == null) {
    	    throw new IllegalArgumentException("Tax can't be null");
    	}
    	
    	if (amount.compareTo(BigDecimal.ZERO) < 0) {
    	    throw new IllegalArgumentException("Tax cannot be negative");
    	}
    	
        tax = amount;
    }


    public BigDecimal billTotal(Person person) {
    	
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal perct = BigDecimal.ZERO;
        BigDecimal ptax = BigDecimal.ZERO;
        
        for (Person pObj : people) {
            total = total.add(personTotal(pObj));
        }
        
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Bill must have at least one item");
        }
        
        perct = personTotal(person).divide(total, 10, RoundingMode.HALF_UP);
        ptax = tax.multiply(perct);
        
        return ptax.add(personTotal(person));
    }


    public void addTip(BigDecimal amount) {
    	
    	if (amount == null) {
    	    throw new IllegalArgumentException("Tip can't be null");
    	}
    	
    	if (amount.compareTo(BigDecimal.ZERO) < 0) {
    	    throw new IllegalArgumentException("Tip cannot be negative");
    	}
    	
        tip = amount;
    }


    public BigDecimal unroundedFinalTotal(Person person) {
    	
    	if (people.size() == 0) {
    	    throw new IllegalArgumentException("Bill must have at least one person");
    	}
    	
        BigDecimal count = BigDecimal.valueOf(people.size());
        BigDecimal persontip = tip.divide(count, 10, RoundingMode.HALF_UP);
        
        return billTotal(person).add(persontip);
    }


    public BigDecimal balance(Person person) {
    	
        BigDecimal balance = BigDecimal.ZERO;
        balance = person.getPaid().subtract(person.getFinalTotal());
        
        return balance;
    }


    public void settlement() {
    	
        for (Person pObj : people) {
        	
            BigDecimal balance = balance(pObj);
            
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                System.out.println(
                    pObj.getName() + " should recieve " + balance
                );
            }
            else if (balance.compareTo(BigDecimal.ZERO) < 0) {
                System.out.println(
                    pObj.getName() + " owes " + balance.negate()
                );
            }
            else {
                System.out.println(
                    pObj.getName() + " has cleared their balance"
                );
            }
        }
    }


    public List<SettlementTransaction> clearing() {
    	
        calculateFinalTotals();
        
        List<SettlementTransaction> transactions = new ArrayList<>();

        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalOwed = BigDecimal.ZERO;

        for (Person pObj : people) {
        	
            pObj.setBalance(balance(pObj));
            
            totalPaid = totalPaid.add(pObj.getPaid());
            totalOwed = totalOwed.add(pObj.getFinalTotal());
        }

        BigDecimal restaurantBalance = totalOwed.subtract(totalPaid);

        if (restaurantBalance.compareTo(BigDecimal.ZERO) > 0) {
        	
            for (Person pObj : people) {
            	
                if (pObj.getBalance().compareTo(BigDecimal.ZERO) < 0) {
                	
                    BigDecimal payment = pObj.getBalance()
                            .negate()
                            .min(restaurantBalance);
                    
                    pObj.setBalance(pObj.getBalance().add(payment));
                    restaurantBalance = restaurantBalance.subtract(payment);
                    
                    transactions.add(
                        new SettlementTransaction(
                            pObj.getName(),
                            "Restaurant",
                            payment
                        )
                    );

                    if (restaurantBalance.compareTo(BigDecimal.ZERO) == 0) {
                        break;
                    }
                }
            }
        }
        else if (restaurantBalance.compareTo(BigDecimal.ZERO) < 0) {
        	
            BigDecimal refund = restaurantBalance.negate();

            for (Person pObj : people) {
            	
                if (pObj.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                	
                    BigDecimal payment = pObj.getBalance()
                            .min(refund);
                    
                    pObj.setBalance(
                        pObj.getBalance().subtract(payment)
                    );
                    
                    refund = refund.subtract(payment);
                    
                    transactions.add(
                        new SettlementTransaction(
                            "Restaurant",
                            pObj.getName(),
                            payment
                        )
                    );

                    if (refund.compareTo(BigDecimal.ZERO) == 0) {
                        break;
                    }
                }
            }
        }

        boolean finished = false;

        while (!finished) {
        	
            finished = true;

            for (Person pObj : people) {
            	
                if (pObj.getBalance().compareTo(BigDecimal.ZERO) < 0) {
                	
                    for (Person personObj : people) {
                    	
                        if (personObj.getBalance()
                                .compareTo(BigDecimal.ZERO) > 0) {
                        	
                            BigDecimal payment = pObj.getBalance()
                                    .negate()
                                    .min(personObj.getBalance());
                            
                            pObj.setBalance(
                                pObj.getBalance().add(payment)
                            );
                            
                            personObj.setBalance(
                                personObj.getBalance().subtract(payment)
                            );
                            
                            transactions.add(
                                new SettlementTransaction(
                                    pObj.getName(),
                                    personObj.getName(),
                                    payment
                                )
                            );
                            
                            finished = false;

                            if (pObj.getBalance()
                                    .compareTo(BigDecimal.ZERO) == 0) {
                                break;
                            }
                        }
                    }
                }
            }
        }

        return transactions;
    }
    
    
    public void calculateFinalTotals() {
    	
    	BigDecimal unroundedtotal = new BigDecimal("0");
    	BigDecimal roundedtotal = new BigDecimal("0");
    	BigDecimal difference = new BigDecimal("0");
    	BigDecimal remainder = new BigDecimal("0");
    	BigDecimal penny = new BigDecimal("0.01");
    	
    	int index = 0;
    	
    	HashMap<Person, BigDecimal> remainders = new HashMap<>();
    	ArrayList<Person> sorted = new ArrayList<>(people);
    	
    	if (people.size() == 0) {
    	    throw new IllegalArgumentException("Bill must have at least one person");
    	}
    	
        for (Person pObj : people) {
        	
        	BigDecimal amount = unroundedFinalTotal(pObj);
        	
        	unroundedtotal = unroundedtotal.add(amount);
        	
            remainder = amount.subtract(
                amount.setScale(2, RoundingMode.DOWN)
            );
            
            amount = amount.setScale(2, RoundingMode.DOWN);
            
            pObj.setFinalTotal(amount);
            
            roundedtotal = roundedtotal.add(amount);
            remainders.put(pObj, remainder);
        }
        
        sorted.sort(
            (p1, p2) ->
                remainders.get(p2).compareTo(remainders.get(p1))
        );
        
        difference = unroundedtotal.subtract(roundedtotal);
        
        while(difference.compareTo(BigDecimal.ZERO) > 0) {
        	
        	Person person = sorted.get(index);
        	
            person.setFinalTotal(
                person.getFinalTotal().add(penny)
            );
            
            difference = difference.subtract(penny);
            index++;
            
            if (index == sorted.size()) {
                index = 0;
            }
        }
    }
    
    
    public void shareItem(Person person, Item item) {
    	
    	if (person == null) {
    	    throw new IllegalArgumentException("Person can't be null");
    	}
    	
    	if (item == null) {
    	    throw new IllegalArgumentException("Item can't be null");
    	}
    	
    	if (item.checkItem(person)) {
    		throw new IllegalArgumentException(
                "This Person is already sharing this item"
            );
      	}
    	
    	if (!people.contains(person)) {
    	    throw new IllegalArgumentException(
                "Person is not in this bill"
            );
    	}

    	if (!items.contains(item)) {
    	    throw new IllegalArgumentException(
                "Item is not in this bill"
            );
    	}
    	
        item.whoshared(person);
    }
    
    
    public Person findPersonById(Long personId) {
        if (personId == null) {
            return null;
        }

        for (Person pObj : people) {
            if (pObj.getId().equals(personId)) {
                return pObj;
            }
        }

        return null;
    }

    public void updatePerson(Person person, String name) {
        if (person == null) {
            throw new IllegalArgumentException("Person can't be null");
        }

        if (name == null) {
            throw new IllegalArgumentException("Person name can't be null");
        }

        String cleanName = name.trim();

        if (cleanName.isBlank()) {
            throw new IllegalArgumentException("Person name can't be blank");
        }

        Person existing = findPerson(cleanName);

        if (existing != null && !existing.getId().equals(person.getId())) {
            throw new IllegalArgumentException("Duplicate name can't be stored");
        }

        person.setName(cleanName);
    }

    public void removePerson(Person person) {
        if (person == null || !people.contains(person)) {
            throw new IllegalArgumentException("Person is not in this bill");
        }

        for (Item item : items) {
            item.unsharePerson(person);
        }

        people.remove(person);
    }

    public void updateItem(Item item, String name, BigDecimal price, int quantity) {
        if (item == null || !items.contains(item)) {
            throw new IllegalArgumentException("Item is not in this bill");
        }

        if (name == null) {
            throw new IllegalArgumentException("Item name can't be null");
        }

        if (name.isBlank()) {
            throw new IllegalArgumentException("Item name can't be blank");
        }

        if (price == null) {
            throw new IllegalArgumentException("Item price can't be null");
        }

        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Item price must be greater than zero");
        }

        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }

        item.setItem(name.trim());
        item.setPrice(price);
        item.setQuantity(quantity);
    }

    public void removeItem(Item item) {
        if (item == null || !items.contains(item)) {
            throw new IllegalArgumentException("Item is not in this bill");
        }

        item.getPeople().clear();
        items.remove(item);
    }

    public Long getId() {
        return id;
    }
    
    
    public List<Person> getPeople() {
        return people;
    }
    
    
    public String getAccessCodeHash() {
        return accessCodeHash;
    }


    public void setAccessCodeHash(String accessCodeHash) {
        this.accessCodeHash = accessCodeHash;
    }
    
    
    public List<Item> getItems() {
        return items;
    }


    public BigDecimal getTax() {
        return tax;
    }


    public BigDecimal getTip() {
        return tip;
    }
    
    public Item addItem(String iname, BigDecimal iprice) {
        return addItem(iname, iprice, 1);
    }
    
    public void unshareItem(Person person, Item item) {
        if (!item.checkItem(person)) {
            throw new IllegalArgumentException(
                    person.getName() + " is not sharing this item"
            );
        }

        item.unsharePerson(person);
    }
}