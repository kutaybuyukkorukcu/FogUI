package com.genui.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for UserRole enum.
 * Tests role values and monthly quotas.
 */
@DisplayName("UserRole")
class UserRoleTest {

    @Nested
    @DisplayName("Monthly Quotas")
    class MonthlyQuotas {

        @Test
        @DisplayName("FREE role should have monthlyQuota of 100")
        void freeRoleShouldHaveQuotaOf100() {
            assertEquals(100, UserRole.FREE.getMonthlyQuota());
        }

        @Test
        @DisplayName("PRO role should have monthlyQuota of 10000")
        void proRoleShouldHaveQuotaOf10000() {
            assertEquals(10_000, UserRole.PRO.getMonthlyQuota());
        }
    }

    @Nested
    @DisplayName("Enum Values")
    class EnumValues {

        @Test
        @DisplayName("should have exactly two roles")
        void shouldHaveExactlyTwoRoles() {
            assertEquals(2, UserRole.values().length);
        }

        @Test
        @DisplayName("should have FREE role")
        void shouldHaveFreeRole() {
            assertNotNull(UserRole.valueOf("FREE"));
        }

        @Test
        @DisplayName("should have PRO role")
        void shouldHaveProRole() {
            assertNotNull(UserRole.valueOf("PRO"));
        }

        @Test
        @DisplayName("FREE should have lower quota than PRO")
        void freeShouldHaveLowerQuotaThanPro() {
            assertTrue(UserRole.FREE.getMonthlyQuota() < UserRole.PRO.getMonthlyQuota());
        }
    }

    @Nested
    @DisplayName("Role Names")
    class RoleNames {

        @Test
        @DisplayName("FREE role name should be FREE")
        void freeRoleNameShouldBeFree() {
            assertEquals("FREE", UserRole.FREE.name());
        }

        @Test
        @DisplayName("PRO role name should be PRO")
        void proRoleNameShouldBePro() {
            assertEquals("PRO", UserRole.PRO.name());
        }
    }
}
