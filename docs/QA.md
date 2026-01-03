# Q&A: Spring Security & Modern Java Concepts

Educational answers to common questions about the FogUI backend implementation.

---

## Refresh Token Strategy

**Status**: Not implemented yet.

| Approach | Pros | Cons |
|----------|------|------|
| **Short-lived JWT only** (current) | Simple | User gets logged out frequently |
| **Long-lived JWT** | Simple | If stolen, valid for a long time = security risk |
| **JWT + Refresh Token** | Short-lived access (15min), refresh extends session securely | More complex, needs token storage |

**Recommendation**: For an MVP, a 24-hour JWT is fine. Refresh tokens add value when you have high-security requirements, long user sessions, or need to revoke specific sessions.

---

## Session Management vs JWT

```java
.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

### Session-based Auth (Traditional)

```
User logs in → Server creates SESSION, stores in memory/Redis
                            ↓
          Server sends SESSION_ID as cookie
                            ↓
Every request: User sends cookie → Server looks up session
```

The server **remembers** who you are. This is "stateful."

### JWT Auth

```
User logs in → Server creates JWT (contains user info, signed)
                            ↓
          Server sends JWT to client
                            ↓
Every request: User sends JWT → Server validates signature (no lookup!)
```

The server **doesn't remember** anything. The token **contains** the authentication info. This is "stateless."

**`SessionCreationPolicy.STATELESS`** tells Spring: *"Don't create HttpSession objects. We're using JWTs, so don't waste memory tracking sessions."*

---

## OncePerRequestFilter & Filter Chain

**Filters ARE Spring's version of middleware.**

### The Filter Chain

```
HTTP Request
    ↓
┌─────────────────────────────────────────────┐
│ Filter 1: JwtAuthenticationFilter           │
│   → doFilterInternal() runs                 │
│   → calls filterChain.doFilter() to proceed │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Filter 2: ApiKeyAuthenticationFilter        │
│   → doFilterInternal() runs                 │
│   → calls filterChain.doFilter() to proceed │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Filter 3, 4, 5... (Spring's built-in)       │
└─────────────────────────────────────────────┘
    ↓
Your Controller handles the request
    ↓
Response flows back UP through filters
```

### OncePerRequestFilter

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) { ... }
}
```

**Why `OncePerRequestFilter`?** In complex apps, a request might be *forwarded* internally (e.g., error pages). Regular filters would run AGAIN. `OncePerRequestFilter` guarantees your logic runs **exactly once per request**.

### doFilterInternal

```java
doFilterInternal(HttpServletRequest request,  // The incoming request
                 HttpServletResponse response, // The response you can modify
                 FilterChain filterChain)      // The "next middleware" to call
```

- **Calling `filterChain.doFilter(request, response)`** = *"I'm done, pass to the next filter."*
- **Not calling it** = *"Stop here, don't proceed."* (e.g., returning 401)

---

## @Bean Annotation

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

**`@Bean`** tells Spring: *"Put this object into your IoC container. When anyone asks for a `PasswordEncoder`, give them this instance."*

Think of it as **registering a factory method**:
- Spring calls this method once at startup
- Stores the returned object  
- Injects it wherever `@Autowired PasswordEncoder` is requested

It's the explicit version of `@Component`/`@Service` for when you need to configure 3rd-party classes.

---

## @Builder Annotation (Lombok)

```java
@Builder
public class ChatSession {
    private UUID id;
    private String messages;
}
```

Generates a **Builder Pattern**:

```java
// Instead of:
ChatSession session = new ChatSession();
session.setId(uuid);
session.setMessages("[]");

// You can write:
ChatSession session = ChatSession.builder()
    .id(uuid)
    .messages("[]")
    .build();
```

**Benefits**: Immutable-friendly, named parameters, optional fields handled gracefully.

---

## Method References (`User::getActive`)

Introduced in **Java 8 (2014)** alongside lambdas:

```java
// Lambda
list.forEach(item -> System.out.println(item));

// Method reference (shorthand)
list.forEach(System.out::println);

// Types:
ClassName::staticMethod      // Math::abs
instance::instanceMethod     // user::getName
ClassName::instanceMethod    // User::getActive
ClassName::new               // ArrayList::new
```

### Java Evolution Since Java 8

| Version | Year | Key Features |
|---------|------|--------------|
| **Java 8** | 2014 | Lambdas, Streams, Optional, Method References |
| **Java 10** | 2018 | `var` keyword for local variables |
| **Java 11** | 2018 | LTS, `String.isBlank()`, HTTP Client |
| **Java 14** | 2020 | Records (preview), Switch expressions |
| **Java 16** | 2021 | Records (final), Pattern matching for instanceof |
| **Java 17** | 2021 | LTS, Sealed classes |
| **Java 21** | 2023 | LTS, Virtual threads, Pattern matching in switch |

**Key additions:**
- **Records**: `record Point(int x, int y) {}` - Immutable data classes in one line
- **var**: `var list = new ArrayList<String>();` - Type inference
- **Pattern matching**: `if (obj instanceof String s) { use(s); }` - Cast + assign
- **Text blocks**: Multi-line strings with `"""..."""`

---

## Reflection in Spring

**Reflection** = The ability of a program to examine and modify itself at runtime.

```java
// Normal Java:
User user = new User();
user.setName("John");

// With Reflection:
Class<?> clazz = Class.forName("com.genui.entity.User");
Object user = clazz.getDeclaredConstructor().newInstance();
Method setter = clazz.getMethod("setName", String.class);
setter.invoke(user, "John");
```

**How Spring uses it:**

1. **Dependency Injection**: Reads `@Autowired`, finds field type via reflection, injects dependency
2. **Annotations Processing**: Finds `@GetMapping` methods, extracts paths, registers routes
3. **JPA/Hibernate**: Maps database rows to objects by reading field names/types
4. **AOP**: Creates proxy objects at runtime that wrap your classes

---

## @AuthenticationPrincipal

```java
@GetMapping("/me")
public User getCurrentUser(@AuthenticationPrincipal ApiKeyUserDetails principal) {
    return principal.getUser();
}
```

This annotation **injects the currently authenticated user** directly into your controller.

**Without it:**
```java
@GetMapping("/me")
public User getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    ApiKeyUserDetails principal = (ApiKeyUserDetails) auth.getPrincipal();
    return principal.getUser();
}
```

The "principal" is whatever you set in the filter:
```java
UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
    userDetails,  // ← THIS becomes the @AuthenticationPrincipal
    null, 
    userDetails.getAuthorities()
);
SecurityContextHolder.getContext().setAuthentication(authentication);
```
