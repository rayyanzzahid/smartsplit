package com.smartsplit.smartsplit;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

@SpringBootApplication
public class SmartsplitApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartsplitApplication.class, args);
	}

	@RestControllerAdvice
	public class GlobalExceptionHandler {

	    @ExceptionHandler(IllegalArgumentException.class)
	    public ResponseEntity<String> handleExceptions(IllegalArgumentException e) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
	    }
	}

	@RestController
	public class SmartSplitController {

		private final PersonRepository personRepository;
		private final BillRepository billRepository;
		private final ItemRepository itemRepository;
		private final BillSecurity billSecurity;

		public SmartSplitController(
				PersonRepository personRepository,
				BillRepository billRepository,
				ItemRepository itemRepository,
		        BillSecurity billSecurity) {

		    this.personRepository = personRepository;
		    this.billRepository = billRepository;
		    this.itemRepository = itemRepository;
		    this.billSecurity = billSecurity;
		}

		private Bill getAuthorizedBill(Long billId, String accessCode) {

			if (billId == null) {
				throw new IllegalArgumentException("Bill ID can't be null");
			}

			if (accessCode == null || accessCode.isBlank()) {
				throw new IllegalArgumentException("Bill access code is required");
			}

			Bill bill = billRepository.findById(billId)
					.orElseThrow(() -> new IllegalArgumentException("Bill not found: " + billId));

			if (!billSecurity.checkAccessCode(accessCode, bill.getAccessCodeHash())) {
				throw new IllegalArgumentException("Invalid bill access code");
			}

			return bill;
		}

		public static class ActionResponse {
			private String message;

			public ActionResponse(String message) {
				this.message = message;
			}

			public String getMessage() {
				return message;
			}
		}

		public static class BillResponse {
			private String message;
			private Long billId;
			private String accessCode;

			public BillResponse(String message, Long billId, String accessCode) {
				this.message = message;
				this.billId = billId;
				this.accessCode = accessCode;
			}

			public String getMessage() {
				return message;
			}

			public Long getBillId() {
				return billId;
			}

			public String getAccessCode() {
				return accessCode;
			}
		}

		@PostMapping("/bill")
		public BillResponse createBill() {

			Bill newBill = new Bill();

			String accessCode = billSecurity.generateAccessCode();

			newBill.setAccessCodeHash(
					billSecurity.hashAccessCode(accessCode)
			);

			billRepository.save(newBill);

			return new BillResponse(
					"Bill created successfully",
					newBill.getId(),
					accessCode
			);
		}

		public static class PersonRequest {

			private Long personId;
			private String name;
			private Long billId;

			public Long getPersonId() {
				return personId;
			}

			public void setPersonId(Long personId) {
				this.personId = personId;
			}

			public String getName() {
				return name;
			}

			public void setName(String name) {
				this.name = name;
			}

			public Long getBillId() {
				return billId;
			}

			public void setBillId(Long billId) {
				this.billId = billId;
			}
		}

		public static class PersonResponse {

			private String message;
			private String name;
			private Long personId;

			public PersonResponse(String message, String name, Long personId) {
				this.message = message;
				this.name = name;
				this.personId = personId;
			}

			public String getMessage() {
				return message;
			}

			public String getName() {
				return name;
			}

			public Long getPersonId() {
				return personId;
			}
		}

		@PostMapping("/person")
		public PersonResponse addPersonPost(
				@RequestBody PersonRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

			Person person = bill.addPerson(request.getName());

			personRepository.save(person);

			return new PersonResponse(
					"Person added successfully",
					person.getName(),
					person.getId()
			);
		}

		@PutMapping("/person")
		public PersonResponse updatePerson(
				@RequestBody PersonRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

			if (request.getPersonId() == null) {
				throw new IllegalArgumentException("Person ID can't be null");
			}

			Person person = bill.findPersonById(request.getPersonId());

			if (person == null) {
				throw new IllegalArgumentException("Person not found: " + request.getPersonId());
			}

			bill.updatePerson(person, request.getName());
			personRepository.save(person);

			return new PersonResponse(
					"Person updated successfully",
					person.getName(),
					person.getId()
			);
		}

		@Transactional
		@DeleteMapping("/person")
		public ActionResponse deletePerson(
				@RequestBody PersonRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

			if (request.getPersonId() == null) {
				throw new IllegalArgumentException("Person ID can't be null");
			}

			Person person = bill.findPersonById(request.getPersonId());

			if (person == null) {
				throw new IllegalArgumentException("Person not found: " + request.getPersonId());
			}

			String deletedName = person.getName();
			bill.removePerson(person);

			for (Item item : bill.getItems()) {
				itemRepository.save(item);
			}

			personRepository.delete(person);

			return new ActionResponse(deletedName + " deleted successfully");
		}

		public static class ItemRequest {

		    private Long itemId;
		    private String itemname;
		    private BigDecimal price;
		    private Long billId;
		    private Integer quantity;

		    public Long getItemId() {
		        return itemId;
		    }

		    public void setItemId(Long itemId) {
		        this.itemId = itemId;
		    }

		    public String getItemname() {
		        return itemname;
		    }

		    public BigDecimal getPrice() {
		        return price;
		    }

		    public Long getBillId() {
		        return billId;
		    }

		    public Integer getQuantity() {
		        return quantity;
		    }

		    public void setItemname(String itemname) {
		        this.itemname = itemname;
		    }

		    public void setPrice(BigDecimal price) {
		        this.price = price;
		    }

		    public void setBillId(Long billId) {
		        this.billId = billId;
		    }

		    public void setQuantity(Integer quantity) {
		        this.quantity = quantity;
		    }
		}

		public static class ItemResponse {

		    private String message;
		    private String item;
		    private BigDecimal price;
		    private Long itemId;
		    private int quantity;

		    public ItemResponse(String message, String item, BigDecimal price, Long itemId, int quantity) {
		        this.message = message;
		        this.item = item;
		        this.price = price;
		        this.itemId = itemId;
		        this.quantity = quantity;
		    }

		    public String getMessage() {
		        return message;
		    }

		    public String getItem() {
		        return item;
		    }

		    public BigDecimal getPrice() {
		        return price;
		    }

		    public Long getItemId() {
		        return itemId;
		    }

		    public int getQuantity() {
		        return quantity;
		    }
		}

		@PostMapping("/item")
		public ItemResponse addItemPost(
		        @RequestBody ItemRequest request,
		        @RequestHeader("X-Bill-Access-Code") String accessCode) {

		    Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

		    int quantity = request.getQuantity() == null ? 1 : request.getQuantity();

		    Item item = bill.addItem(
		            request.getItemname(),
		            request.getPrice(),
		            quantity
		    );

		    itemRepository.save(item);

		    return new ItemResponse(
		            "Item added successfully",
		            item.getItem(),
		            item.getPrice(),
		            item.getId(),
		            item.getQuantity()
		    );
		}

		@PutMapping("/item")
		public ItemResponse updateItem(
		        @RequestBody ItemRequest request,
		        @RequestHeader("X-Bill-Access-Code") String accessCode) {

		    Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

		    if (request.getItemId() == null) {
		        throw new IllegalArgumentException("Item ID can't be null");
		    }

		    int quantity = request.getQuantity() == null ? 1 : request.getQuantity();
		    Item item = bill.findItemById(request.getItemId());

		    if (item == null) {
		        throw new IllegalArgumentException("Item not found: " + request.getItemId());
		    }

		    bill.updateItem(item, request.getItemname(), request.getPrice(), quantity);
		    itemRepository.save(item);

		    return new ItemResponse(
		            "Item updated successfully",
		            item.getItem(),
		            item.getPrice(),
		            item.getId(),
		            item.getQuantity()
		    );
		}

		@Transactional
		@DeleteMapping("/item")
		public ActionResponse deleteItem(
		        @RequestBody ItemRequest request,
		        @RequestHeader("X-Bill-Access-Code") String accessCode) {

		    Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

		    if (request.getItemId() == null) {
		        throw new IllegalArgumentException("Item ID can't be null");
		    }

		    Item item = bill.findItemById(request.getItemId());

		    if (item == null) {
		        throw new IllegalArgumentException("Item not found: " + request.getItemId());
		    }

		    String deletedName = item.getItem();
		    bill.removeItem(item);
		    itemRepository.save(item);
		    itemRepository.delete(item);

		    return new ActionResponse(deletedName + " deleted successfully");
		}

		public static class ShareRequest {

		    private String personName;
		    private Long itemId;
		    private Long billId;

		    public String getPersonName() {
		        return personName;
		    }

		    public Long getItemId() {
		        return itemId;
		    }

		    public void setPersonName(String personName) {
		        this.personName = personName;
		    }

		    public void setItemId(Long itemId) {
		        this.itemId = itemId;
		    }

		    public Long getBillId() {
		        return billId;
		    }

		    public void setBillId(Long billId) {
		        this.billId = billId;
		    }
		}

		public static class ShareResponse {

		    private String message;
		    private String personName;
		    private String itemName;

		    public ShareResponse(String message, String personName, String itemName) {
		        this.message = message;
		        this.personName = personName;
		        this.itemName = itemName;
		    }

		    public String getMessage() {
		        return message;
		    }

		    public String getPersonName() {
		        return personName;
		    }

		    public String getItemName() {
		        return itemName;
		    }
		}

		@PostMapping("/shareItem")
		public ShareResponse share(
		        @RequestBody ShareRequest request,
		        @RequestHeader("X-Bill-Access-Code") String accessCode) {

		    Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

		    if (request.getPersonName() == null || request.getPersonName().isBlank()) {
		        throw new IllegalArgumentException("Person name can't be blank");
		    }

		    if (request.getItemId() == null) {
		        throw new IllegalArgumentException("Item ID can't be null");
		    }

		    Person person = bill.findPerson(request.getPersonName());

		    if (person == null) {
		        throw new IllegalArgumentException(
		                "Person not found: " + request.getPersonName()
		        );
		    }

		    Item item = bill.findItemById(request.getItemId());

		    if (item == null) {
		        throw new IllegalArgumentException(
		                "Item not found: " + request.getItemId()
		        );
		    }

		    bill.shareItem(person, item);
		    itemRepository.save(item);

		    return new ShareResponse(
		            "Item shared successfully",
		            person.getName(),
		            item.getItem()
		    );
		}

		public static class TotalResponse {

		    private String personName;
		    private BigDecimal total;

		    public TotalResponse(String personName, BigDecimal total) {
		        this.personName = personName;
		        this.total = total;
		    }

		    public String getPersonName() {
		        return personName;
		    }

		    public BigDecimal getTotal() {
		        return total;
		    }
		}

		@GetMapping("/total")
		public TotalResponse billTotal(
				@RequestParam String personName,
				@RequestParam Long billId,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(billId, accessCode);

			if (personName == null || personName.isBlank()) {
			    throw new IllegalArgumentException("Person name can't be blank");
			}

			Person person = bill.findPerson(personName);

			if (person == null) {
		        throw new IllegalArgumentException("Person not found: " + personName);
		    }

			return new TotalResponse(
					person.getName(),
					bill.billTotal(person).setScale(2, RoundingMode.HALF_UP)
			);
		}

		public static class TaxRequest {

			private BigDecimal tax;
			private Long billId;

			public BigDecimal getTax() {
				return tax;
			}

			public void setTax(BigDecimal tax) {
				this.tax = tax;
			}

			public Long getBillId() {
			    return billId;
			}

			public void setBillId(Long billId) {
			    this.billId = billId;
			}
		}

		public static class TaxResponse {

		    private String message;
		    private BigDecimal tax;

		    public TaxResponse(String message, BigDecimal tax) {
		        this.message = message;
		        this.tax = tax;
		    }

		    public String getMessage() {
		        return message;
		    }

		    public BigDecimal getTax() {
		        return tax;
		    }
		}

		@PostMapping("/tax")
		public TaxResponse addTax(
				@RequestBody TaxRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

			bill.addTax(request.getTax());
			billRepository.save(bill);

			return new TaxResponse(
					"Tax set successfully",
					request.getTax()
			);
		}

		public static class TipRequest {

			private BigDecimal tip;
			private Long billId;

			public BigDecimal getTip() {
				return tip;
			}

			public void setTip(BigDecimal tip) {
				this.tip = tip;
			}

			public Long getBillId() {
			    return billId;
			}

			public void setBillId(Long billId) {
			    this.billId = billId;
			}
		}

		public static class TipResponse {

		    private String message;
		    private BigDecimal tip;

		    public TipResponse(String message, BigDecimal tip) {
		        this.message = message;
		        this.tip = tip;
		    }

		    public String getMessage() {
		        return message;
		    }

		    public BigDecimal getTip() {
		        return tip;
		    }
		}

		@PostMapping("/tip")
		public TipResponse addTip(
				@RequestBody TipRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

			bill.addTip(request.getTip());
			billRepository.save(bill);

			return new TipResponse(
					"Tip set successfully",
					request.getTip()
			);
		}

		public static class FinalTotalResponse {

		    private String personName;
		    private BigDecimal finalTotal;

		    public FinalTotalResponse(String personName, BigDecimal finalTotal) {
		        this.personName = personName;
		        this.finalTotal = finalTotal;
		    }

		    public String getPersonName() {
		        return personName;
		    }

		    public BigDecimal getFinalTotal() {
		        return finalTotal;
		    }
		}

		@GetMapping("/finalTotal")
		public FinalTotalResponse finalTotal(
				@RequestParam String personName,
				@RequestParam Long billId,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(billId, accessCode);

			if (personName == null || personName.isBlank()) {
			    throw new IllegalArgumentException("Person name can't be blank");
			}

		    Person person = bill.findPerson(personName);

		    if (person == null) {
		        throw new IllegalArgumentException("Person not found: " + personName);
		    }

		    bill.calculateFinalTotals();

		    for (Person pObj : bill.getPeople()) {
		        personRepository.save(pObj);
		    }

		    return new FinalTotalResponse(
		    		person.getName(),
		    		person.getFinalTotal().setScale(2, RoundingMode.HALF_UP)
		    );
		}

		public static class PaidRequest {

			private BigDecimal paid;
			private String name;
			private Long billId;

			public BigDecimal getPaid() {
				return paid;
			}

			public String getName() {
				return name;
			}

			public void setPaid(BigDecimal paid) {
				this.paid = paid;
			}

			public void setName(String name) {
				this.name = name;
			}

			public Long getBillId() {
				return billId;
			}

			public void setBillId(Long billId) {
			    this.billId = billId;
			}
		}

		public static class PaidResponse {

		    private String message;
		    private String personName;
		    private BigDecimal paid;

		    public PaidResponse(String message, String personName, BigDecimal paid) {
		        this.message = message;
		        this.personName = personName;
		        this.paid = paid;
		    }

		    public String getMessage() {
		        return message;
		    }

		    public String getPersonName() {
		        return personName;
		    }

		    public BigDecimal getPaid() {
		        return paid;
		    }
		}

		@PostMapping("/paid")
		public PaidResponse paid(
				@RequestBody PaidRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

			if (request.getName() == null || request.getName().isBlank()) {
			    throw new IllegalArgumentException("Person name can't be blank");
			}

			Person person = bill.findPerson(request.getName());

			if (person == null) {
			    throw new IllegalArgumentException(
			        "Person not found: " + request.getName()
			    );
			}

			person.paid(request.getPaid());
			personRepository.save(person);

			return new PaidResponse(
					"Payment recorded successfully",
					person.getName(),
					request.getPaid()
			);
		}

		public static class BalanceResponse {

		    private String personName;
		    private BigDecimal balance;

		    public BalanceResponse(String personName, BigDecimal balance) {
		        this.personName = personName;
		        this.balance = balance;
		    }

		    public String getPersonName() {
		        return personName;
		    }

		    public BigDecimal getBalance() {
		        return balance;
		    }
		}

		@GetMapping("/balance")
		public BalanceResponse balance(
				@RequestParam String personName,
				@RequestParam Long billId,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(billId, accessCode);

			if (personName == null || personName.isBlank()) {
			    throw new IllegalArgumentException("Person name can't be blank");
			}

		    Person person = bill.findPerson(personName);

		    if (person == null) {
		        throw new IllegalArgumentException("Person not found: " + personName);
		    }

		    return new BalanceResponse(
		    		person.getName(),
		    		bill.balance(person).setScale(2, RoundingMode.HALF_UP)
		    );
		}

		public static class SettlementRequest {

			private Long billId;

			public Long getBillId() {
				return billId;
			}

			public void setBillId(Long billId) {
			    this.billId = billId;
			}
		}

		public static class SettlementResponse {

			private String message;
		    private List<SettlementTransaction> transactions;

		    public SettlementResponse(String message, List<SettlementTransaction> transactions) {
		        this.message = message;
		        this.transactions = transactions;
		    }

		    public String getMessage() {
		        return message;
		    }

		    public List<SettlementTransaction> getTransactions() {
		    	return transactions;
		    }
		}

		@PostMapping("/settlement")
		public SettlementResponse settlement(
				@RequestBody SettlementRequest request,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(request.getBillId(), accessCode);

		    List<SettlementTransaction> transactions = bill.clearing();

		    return new SettlementResponse(
		    		"Settlement calculated successfully",
		    		transactions
		    );
		}

		public static class SummaryResponse {

			private Long billId;
			private List<PeopleResponse> people;

			public static class PeopleResponse {

				private String name;
				private BigDecimal total;
				private BigDecimal paid;
				private BigDecimal balance;

				public PeopleResponse(String name, BigDecimal total, BigDecimal paid, BigDecimal balance) {
					this.name = name;
					this.total = total;
					this.paid = paid;
					this.balance = balance;
				}

				public String getName() {
					return name;
				}

				public BigDecimal getTotal() {
					return total;
				}

				public BigDecimal getPaid() {
					return paid;
				}

				public BigDecimal getBalance() {
					return balance;
				}
			}

			public SummaryResponse(Long billId, List<PeopleResponse> people) {
				this.billId = billId;
				this.people = people;
			}

			public Long getBillId() {
				return billId;
			}

			public List<PeopleResponse> getPeople() {
				return people;
			}
		}

		@GetMapping("/summary")
		public SummaryResponse summary(
				@RequestParam Long billId,
				@RequestHeader("X-Bill-Access-Code") String accessCode) {

			Bill bill = getAuthorizedBill(billId, accessCode);

			List<SummaryResponse.PeopleResponse> people = new ArrayList<>();

			bill.calculateFinalTotals();

			for (Person person : bill.getPeople()) {

			    BigDecimal total = person.getFinalTotal();
			    BigDecimal paid = person.getPaid();
			    BigDecimal balance = bill.balance(person);

			    people.add(
			    		new SummaryResponse.PeopleResponse(
			    				person.getName(),
			    				total,
			    				paid,
			    				balance
			    		)
			    );

			    personRepository.save(person);
			}

			return new SummaryResponse(
					billId,
					people
			);
		}

		public static class LoadBillResponse {
		    private Long billId;
		    private BigDecimal tax;
		    private BigDecimal tip;
		    private List<LoadPersonResponse> people;
		    private List<LoadItemResponse> items;

		    public LoadBillResponse(Long billId, BigDecimal tax, BigDecimal tip, List<LoadPersonResponse> people, List<LoadItemResponse> items) {
		        this.billId = billId;
		        this.tax = tax;
		        this.tip = tip;
		        this.people = people;
		        this.items = items;
		    }

		    public Long getBillId() {
		        return billId;
		    }

		    public BigDecimal getTax() {
		        return tax;
		    }

		    public BigDecimal getTip() {
		        return tip;
		    }

		    public List<LoadPersonResponse> getPeople() {
		        return people;
		    }

		    public List<LoadItemResponse> getItems() {
		        return items;
		    }
		}

		public static class LoadPersonResponse {
		    private Long id;
		    private String name;
		    private BigDecimal paid;
		    private BigDecimal finalTotal;
		    private BigDecimal balance;

		    public LoadPersonResponse(Long id, String name, BigDecimal paid, BigDecimal finalTotal, BigDecimal balance) {
		        this.id = id;
		        this.name = name;
		        this.paid = paid;
		        this.finalTotal = finalTotal;
		        this.balance = balance;
		    }

		    public Long getId() {
		        return id;
		    }

		    public String getName() {
		        return name;
		    }

		    public BigDecimal getPaid() {
		        return paid;
		    }

		    public BigDecimal getFinalTotal() {
		        return finalTotal;
		    }

		    public BigDecimal getBalance() {
		        return balance;
		    }
		}

		public static class LoadItemResponse {
		    private Long id;
		    private String name;
		    private BigDecimal price;
		    private int quantity;
		    private List<String> sharedBy;

		    public LoadItemResponse(Long id, String name, BigDecimal price, int quantity, List<String> sharedBy) {
		        this.id = id;
		        this.name = name;
		        this.price = price;
		        this.quantity = quantity;
		        this.sharedBy = sharedBy;
		    }

		    public Long getId() {
		        return id;
		    }

		    public String getName() {
		        return name;
		    }

		    public BigDecimal getPrice() {
		        return price;
		    }

		    public int getQuantity() {
		        return quantity;
		    }

		    public List<String> getSharedBy() {
		        return sharedBy;
		    }
		}

		@GetMapping("/bill/load")
		public LoadBillResponse loadBill(
		        @RequestParam Long billId,
		        @RequestHeader("X-Bill-Access-Code") String accessCode) {

		    Bill bill = getAuthorizedBill(billId, accessCode);

		    List<LoadPersonResponse> people = new ArrayList<>();

		    for (Person person : bill.getPeople()) {
		        people.add(
		                new LoadPersonResponse(
		                        person.getId(),
		                        person.getName(),
		                        person.getPaid(),
		                        person.getFinalTotal(),
		                        person.getBalance()
		                )
		        );
		    }

		    List<LoadItemResponse> items = new ArrayList<>();

		    for (Item item : bill.getItems()) {
		        List<String> sharedBy = new ArrayList<>();

		        for (Person person : item.getPeople()) {
		            sharedBy.add(person.getName());
		        }

		        items.add(
		                new LoadItemResponse(
		                        item.getId(),
		                        item.getItem(),
		                        item.getPrice(),
		                        item.getQuantity(),
		                        sharedBy
		                )
		        );
		    }

		    return new LoadBillResponse(
		            bill.getId(),
		            bill.getTax(),
		            bill.getTip(),
		            people,
		            items
		    );
		}
		
		public static class UnshareItemRequest {

		    private String personName;
		    private Long itemId;
		    private Long billId;

		    public String getPersonName() {
		        return personName;
		    }

		    public Long getItemId() {
		        return itemId;
		    }

		    public Long getBillId() {
		        return billId;
		    }

		    public void setPersonName(String personName) {
		        this.personName = personName;
		    }

		    public void setItemId(Long itemId) {
		        this.itemId = itemId;
		    }

		    public void setBillId(Long billId) {
		        this.billId = billId;
		    }
		}
		
		@PostMapping("/unshareItem")
		public ShareResponse unshareItemPost(
		        @RequestBody UnshareItemRequest request,
		        @RequestHeader("X-Bill-Access-Code") String accessCode) {

		    Bill bill = getAuthorizedBill(
		            request.getBillId(),
		            accessCode
		    );

		    if (request.getPersonName() == null || request.getPersonName().isBlank()) {
		        throw new IllegalArgumentException("Person name can't be blank");
		    }

		    if (request.getItemId() == null) {
		        throw new IllegalArgumentException("Item ID can't be null");
		    }

		    Person person = bill.findPerson(request.getPersonName());

		    if (person == null) {
		        throw new IllegalArgumentException(
		                "Person not found: " + request.getPersonName()
		        );
		    }

		    Item item = bill.findItemById(request.getItemId());

		    if (item == null) {
		        throw new IllegalArgumentException(
		                "Item not found: " + request.getItemId()
		        );
		    }

		    bill.unshareItem(person, item);

		    itemRepository.save(item);

		    return new ShareResponse(
		            "Person removed from item successfully",
		            person.getName(),
		            item.getItem()
		    );
		}
	}

	@Bean
	public WebMvcConfigurer corsConfigurer() {

	    return new WebMvcConfigurer() {

	        @Override
	        public void addCorsMappings(CorsRegistry registry) {

	        	registry.addMapping("/**")
	            .allowedOrigins(frontendUrl)
	            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
	            .allowedHeaders("*");
	        }
	    };
	}
	
	@Value("${app.frontend-url}")
	private String frontendUrl;
}