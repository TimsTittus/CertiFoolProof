"use server"

import { UserRole } from "@/lib/enums"

import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export interface SignupInput {
    name: string
    email: string
    password: string
    role: UserRole
    rolePassword: string
    phone: string
}

export interface SignupResult {
    success: boolean
    error?: string
}

// Map roles to their environment variable passwords
const rolePasswordMap: Record<UserRole, string | undefined> = {
    [UserRole.ADMIN]: process.env.ADMIN_PASSWORD,
    [UserRole.FACULTY]: process.env.FACULTY_PASSWORD,
    [UserRole.CLUB]: process.env.CLUB_PASSWORD,
}

export async function signupUser(input: SignupInput): Promise<SignupResult> {
    try {
        // Validate input
        if (!input.name?.trim()) return { success: false, error: "Full name is required" }
        if (!input.email?.trim()) return { success: false, error: "Email is required" }
        if (!input.password || input.password.length < 6) return { success: false, error: "Password must be at least 6 characters" }
        if (!input.role || !Object.values(UserRole).includes(input.role)) return { success: false, error: "Please select a valid role" }
        if (!input.rolePassword) return { success: false, error: "Role secret key is required" }
        if (!input.phone?.trim()) return { success: false, error: "Phone number is required" }

        // Validate role password
        const expectedPassword = rolePasswordMap[input.role]
        if (!expectedPassword) return { success: false, error: "Role registration is not configured." }
        if (input.rolePassword !== expectedPassword) return { success: false, error: "Invalid role secret key" }

        // Register with Better-Auth
        const response = await auth.api.signUpEmail({
            body: {
                email: input.email.trim().toLowerCase(),
                password: input.password,
                name: input.name.trim(),
                role: input.role,
                phone: input.phone.trim(),
            },
            headers: await headers()
        })

        if (!response) {
            return { success: false, error: "Signup failed" }
        }

        return { success: true }
    } catch (error: unknown) {
        console.error("[SIGNUP] Error:", error)
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again."
        return { success: false, error: message }
    }
}


export interface DemoCredential {
    role: string
    email: string
    password: string
}

export async function getDemoCredentials(): Promise<DemoCredential[]> {
    const credentials: DemoCredential[] = []

    const roles = ["Admin", "Faculty", "Club"] as const
    const envKeys = {
        Admin: { email: "DEMO_ADMIN_EMAIL", password: "DEMO_ADMIN_PASSWORD" },
        Faculty: { email: "DEMO_FACULTY_EMAIL", password: "DEMO_FACULTY_PASSWORD" },
        Club: { email: "DEMO_CLUB_EMAIL", password: "DEMO_CLUB_PASSWORD" },
    }

    for (const role of roles) {
        const email = process.env[envKeys[role].email]
        const password = process.env[envKeys[role].password]
        if (email && password) {
            credentials.push({ role, email, password })
        }
    }
    return credentials
}

export async function logout() {
    const cookieStore = await headers();
    // For Better-Auth, you usually call the sign-out API or clear cookies.
    // Returning a redirect is common.
    // We can also use auth.api.signOut if we want to be explicit.
    await auth.api.signOut({
        headers: cookieStore
    });
    redirect("/login");
}
